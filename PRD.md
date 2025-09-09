# 功能需求

产品定义为一款智能识别翻译管理系统，用户通过上传PDF，系统对PDF拆分为每页一个图片，然后逐个图片识别文本内容，保存为每个txt文件，再把识别的文本通过翻译，得到翻译后的txt文件，
支持不同用户提交解析翻译任务，
支持查看已提交的解析翻译任务列表；
支持从列表中下载处理结果的zip压缩包


## 用户注册登录
- 支持用户以username + password 注册和登录，用户登录后有session，刷新页面不需要重新登陆

通过侧边栏菜单管理页面

页面1：文件上传提交解析任务
用户上传PDF文件，单选选择【仅识别文本】或者【识别并翻译】，然后提交

页面2：任务解析列表页，支持通过【用户名】查询过滤；可以下载该任务的处理结果，以压缩包zip格式； 同时支持删除。

页面3： chatbot对话窗口，支持用户自定义系统提示词，用户输入文本，模型输出思考过程和回答内容



# 数据库表定义

用户表
users
- id: user_id
- user_name
- password
- role: 角色， member | manager | admin

文件解析翻译任务表

meta_parse_task
- id: 主键ID
- user_id：用户ID
- parse_type:  "only_ocr" | "translate" ;  only_ocr 仅对PDF的每一页进行文字识别； translate 需要在每一页识别后，再翻译成民国的中文表达
- file_name: 文件名
- file_path:  文件的地址，本项目上传文件后保存在服务器本地文件系统路径
- page_num: 该PDF文件总共有几页
- statu: 状态， 0-pending; 1-processing; 2-finished; 3-failed

图片 OCR 表，记录每个PDF单页图片及其OCR结果
meta_ocr_output
- id: 主键ID
- task_id:  meta_parse_task 的主键ID
- input_file_path: OCR 输入图片的本地文件系统路径
- output_txt_path: OCR 输出文本的本地文件系统路径
- statu: 状态， 0-pending; 1-processing; 2-finished; 3-failed

TXT翻译表，记录每个PDF单页OCR TXT 及其 翻译结果
meta_translate_output
- id: 主键ID
- task_id:  meta_parse_task 的主键ID
- input_file_path: 输入TXT文件的本地文件系统路径，来自OCR的输出txt文件
- output_txt_path: 输出TXT文件的本地文件系统路径
- statu: 状态， 0-pending; 1-processing; 2-finished; 3-failed


# 后端API

- 实现用户登录注册

- PDF文件转图片

- 图片OCR识别文字

- 文本翻译成民国中文表达

OCR_API_URL = "http://127.0.0.1:8002/v1"
TRANSLATE_API_URL = "http://127.0.0.1:8003/v1"
DEFAULT_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
TRANSLATE_MODEL = "Qwen/Qwen3-14B-FP8"

DEFAULT_OUTPUT_DIR = "/data/test/output_dir"

SYSTEM_PROMPT = """
## Role
You are a translation expert.
## Your Task
- Identify the original and complete text content from the picture without summarizing, concluding, or translating, and do not discard any words.
- Recognize the Chinese characters around the picture character by character in order (from top to bottom, or from left to right). Keep the Chinese parentheses as they are, retain all the original text, and do not make any modifications, summaries, or overviews.
 - If the content of the picture is a table, retain the table layout.
## Output Format
Please output in TXT format.
"""

TRANSLATE_SYSTEM_PROMPT = """把下面这段话，翻译成中文，要求符合**民国时期**的表达方式。
翻译时注意事项：
对于称呼：男性称呼先生，女性称呼女士
对于日期：使用民国日期
对于语言表达：民国时期的表达风格是文言文与白话文的交叉使用
注意遇到人名要准确翻译。
"""

## PDF转图片

def pdf_to_images(pdf_file, output_dir):
    """将PDF文件转换为图片"""
    try:
        pdf_name = os.path.splitext(os.path.basename(pdf_file.name))[0]
        images_dir = os.path.join(output_dir, "images", pdf_name)
        os.makedirs(images_dir, exist_ok=True)
        
        doc = fitz.open(pdf_file.name)
        image_paths = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            image_path = os.path.join(images_dir, f"page_{page_num + 1:03d}.png")
            pix.save(image_path)
            image_paths.append(image_path)
        
        doc.close()
        return image_paths
        
    except Exception as e:
        raise e

## 识别API

def call_ocr_api(image_path, system_prompt):
    """调用OCR API进行图片文字识别"""
    try:        
        client = OpenAI(
            api_key="EMPTY",
            base_url=OCR_API_URL,
        )
        
        with open(image_path, "rb") as f:
            encoded_image = base64.b64encode(f.read())
        encoded_image_text = encoded_image.decode("utf-8")
        base64_qwen = f"data:image;base64,{encoded_image_text}"
        
        if system_prompt:
            system_prompt = system_prompt
        else:
            system_prompt = SYSTEM_PROMPT
        
        chat_response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            temperature=0.01, # 温度,图片理解
            max_tokens=30000, # 最大token数, 留出足够空间给输入
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": base64_qwen
                            },
                        },
                        {"type": "text", "text": "Please identify the text in the picture"},
                    ],
                },
            ],
        )

        return chat_response.choices[0].message.content    
    except Exception as e:
        print(f"OCR API调用失败: {str(e)}")
        raise e

## 翻译API

def call_chat_api(query, chat_history=None, system_prompt=None):
    """调用对话API处理用户文本输入"""
    try:
        client = OpenAI(
            api_key="EMPTY",
            base_url=TRANSLATE_API_URL,
        )
        
        # 构建消息历史
        messages = []
        
        if system_prompt:
            system_prompt = system_prompt
        else:
            system_prompt = TRANSLATE_SYSTEM_PROMPT
        
        # 添加系统提示
        messages.append({
            "role": "system", 
             "content": system_prompt
        })
        
        # 添加历史对话
        if chat_history:
            for message in chat_history:
                # 传统格式: (user_message, assistant_response)
                messages.append({
                    "role": "user",
                    "content": message[0]
                })
                messages.append({
                    "role": "assistant", 
                    "content": message[1]
                })
        
        # 添加当前用户消息
        messages.append({
            "role": "user",
            "content": query
        })
        
        # 调用API
        chat_response = client.chat.completions.create(
            model=TRANSLATE_MODEL,
            temperature=0.7,
            top_p=0.8,
            max_tokens=4096,
            messages=messages,
            extra_body={
                "top_k": 20,
                "enable_thinking": False,
            }
        )
        
        print(f"Chat response: {chat_response.choices[0].message.content}")
        
        return chat_response.choices[0].message.content
        
    except Exception as e:
        print(f"对话API调用失败: {str(e)}")
        return f"抱歉，处理您的请求时出现错误: {str(e)}"