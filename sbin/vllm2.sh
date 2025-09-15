CUDA_VISIBLE_DEVICES=1 vllm serve /home/modelscope/models/Qwen/Qwen3-14B-FP8 \
    --served-model-name Qwen/Qwen3-14B-FP8 \
    --reasoning-parser qwen3 \
    --port 8003 \
    --host 127.0.0.1 \
    --gpu-memory-utilization 0.95 \
    --max-num-batched-tokens 4096 \
    --max-num-seqs 2 \
    --max-model-len 32768
