CUDA_VISIBLE_DEVICES=0 vllm serve /home/lixin/modelscope/Qwen/Qwen2___5-VL-7B-Instruct \
 --served-model-name Qwen/Qwen2.5-VL-7B-Instruct \
 --port 8002 \
 --host 127.0.0.1 \
 --dtype bfloat16 \
 --gpu-memory-utilization 0.95 \
 --max-num-batched-tokens 4096 \
 --max-num-seqs 2 \
 --max-model-len 32768 \
 --limit-mm-per-prompt '{"image": 1, "video": 0}'