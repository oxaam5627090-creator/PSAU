"""LoRA/QLoRA fine-tuning placeholder script using Hugging Face PEFT."""

import argparse
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune base model with LoRA")
    parser.add_argument("--base_model", required=True)
    parser.add_argument("--data_path", required=True)
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    return parser.parse_args()


def main():
    args = parse_args()
    base = Path(args.base_model)
    data = Path(args.data_path)
    output = Path(args.output_dir)

    if not base.exists():
        raise FileNotFoundError(base)
    if not data.exists():
        raise FileNotFoundError(data)

    output.mkdir(parents=True, exist_ok=True)
    # TODO: integrate HuggingFace transformers, datasets, and PEFT here.
    print("Fine-tuning placeholder. Integrate your training pipeline here.")
    print(f"Base: {base}")
    print(f"Data: {data}")
    print(f"Output: {output}")


if __name__ == "__main__":
    main()
