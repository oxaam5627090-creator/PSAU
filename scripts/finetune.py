"""LoRA fine-tuning script for Najdi Arabic university assistant.

This script expects training data inside ``data/university_docs`` in one of the
following formats:

1. JSONL with ``{"prompt": "...", "completion": "..."}``
2. Plain text files – every paragraph becomes an instruction/completion pair
   using a simple heuristic.

Usage (from repository root under WSL):

```
accelerate launch scripts/finetune.py \
  --base_model ./models/base_model \
  --data_path ./data/university_docs \
  --output_dir ./models/fine_tuned
```
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="LoRA fine-tuning")
    parser.add_argument("--base_model", required=True, help="Path or identifier for the base model")
    parser.add_argument("--data_path", required=True, help="Directory with training data")
    parser.add_argument("--output_dir", required=True, help="Where to save adapters")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max_length", type=int, default=1024)
    return parser.parse_args()


def load_documents(path: Path) -> List[dict]:
    samples: List[dict] = []
    for file in path.glob("**/*"):
        if file.suffix.lower() == ".jsonl":
            for line in file.read_text(encoding="utf-8").splitlines():
                record = json.loads(line)
                samples.append({
                    "prompt": record.get("prompt", ""),
                    "completion": record.get("completion", ""),
                })
        elif file.suffix.lower() in {".txt", ""}:
            text = file.read_text(encoding="utf-8", errors="ignore")
            for paragraph in filter(None, (p.strip() for p in text.split("\n\n"))):
                samples.append({
                    "prompt": "اشرح للطالب التالي" if paragraph else "",
                    "completion": paragraph,
                })
    if not samples:
        raise RuntimeError("No training data found in data_path")
    return samples


def prepare_dataset(samples: Iterable[dict], tokenizer, max_length: int) -> Dataset:
    def format_sample(sample: dict) -> str:
        return (
            "### التعليمات:\n"
            + sample["prompt"].strip()
            + "\n\n### الإجابة باللهجة النجدية:\n"
            + sample["completion"].strip()
        )

    texts = [format_sample(sample) for sample in samples]
    tokenized = tokenizer(texts, truncation=True, max_length=max_length)
    return Dataset.from_dict(tokenized)


def main() -> None:
    args = parse_args()
    base_model = args.base_model
    data_path = Path(args.data_path)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = BitsAndBytesConfig(load_in_4bit=True)

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        device_map="auto",
        quantization_config=quantization_config,
    )

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)

    samples = load_documents(data_path)
    dataset = prepare_dataset(samples, tokenizer, args.max_length)

    collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        fp16=torch.cuda.is_available(),
        logging_steps=10,
        save_strategy="epoch",
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=collator,
    )

    trainer.train()
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)


if __name__ == "__main__":
    main()
