#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/ec/.openclaw/workspace/skills/jimeng-video-gen/scripts')
from generate import VolcJimengAPI

api = VolcJimengAPI()
print("测试API连接...")
try:
    task_id = api.submit_text2video(
        prompt="科幻风格，两个发光的AI大脑并排，左边蓝色右边紫色，两者融合成超级AI，背景暗色科技风",
        seconds=5,
        aspect_ratio="16:9"
    )
    print(f"✅ API连接成功！TaskID: {task_id}")
    print(f"⏳ 等待生成（预计1-3分钟）...")
    result = api.get_task_result(task_id, "jimeng_t2v_v30_1080p", max_retries=30, interval=5)
    if result["status"] == "success":
        print(f"✅ 测试视频生成成功: {result['video_url']}")
    else:
        print(f"❌ 生成失败: {result.get('error')}")
except Exception as e:
    print(f"❌ API测试失败: {e}")
