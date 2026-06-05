from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.extraction import ExtractionService

LOGIC_DIR = Path.home() / "Desktop" / "\u903b\u8f91"
OUT_DIR = ROOT / "docs" / "knowledge"
FRAME_DIR = ROOT / ".local" / "video-frames"


TEXT_FILES = [
    Path.home() / "Desktop" / "\u65b9\u6848\u63a8\u6f14AI.md",
    LOGIC_DIR / "\u56db\u79cd\u5e02\u573a\u5206\u6790.docx",
    LOGIC_DIR / "\u5927\u6d77" / "\u5927\u6d77\u79d1\u6280\u6709\u9650\u516c\u53f8 (1).docx",
    LOGIC_DIR / "\u57fa\u7840\u8bfe\u7a0b" / "\u57fa\u7840\u8bfe\u7a0b" / "\u5c0f\u7f8a\u5355\u8f66\u6807\u51c6\u6559\u5b66\u6280\u672f\u624b\u518c20240312.docx",
    LOGIC_DIR / "\u6570\u667a\u5316\u6c99\u76d8" / "\u6570\u667a\u5316\u6c99\u76d8" / "\u6280\u672f\u624b\u518c - \u526f\u672c.pdf",
    LOGIC_DIR / "\u798f\u5efa\u89c4\u5219" / "2026\u5e74\u7701\u8d5b\u89c4\u5219.pdf",
]

VIDEO_FILES = [
    LOGIC_DIR / "\u798f\u5efa\u89c4\u5219" / "e25b2fc07cc6fab0fc90fd9e4c3d6cdf.mp4",
    LOGIC_DIR / "\u62c6\u7ebf" / "bc88b6860324230a7896b842ba5bcd08.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u751f\u4ea7\u7ebf.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u751f\u4ea7\u7ebf1.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u751f\u4ea7\u7ebf2.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u8d37\u6b3e\u89c4\u5219.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u8d34\u73b0.mp4",
    LOGIC_DIR / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u89c4\u5219\u8bb2\u89e3 ISO\uff0c\u5e02\u573a\uff0c\u4ea7\u54c1" / "\u539f\u6750\u6599.mp4",
    LOGIC_DIR / "\u5e7f\u544a\u7ec4\u6210" / "\u5e7f\u544a\u7ec4\u6210" / "\u5e7f\u544a\u7ec4\u6210.mp4",
    LOGIC_DIR / "\u57fa\u7840\u8bfe\u7a0b" / "\u57fa\u7840\u8bfe\u7a0b" / "\u8868\u683c" / "\u8868\u683c\u5236\u4f5c.mp4",
    LOGIC_DIR / "\u6570\u667a\u5316\u6c99\u76d8" / "\u6570\u667a\u5316\u6c99\u76d8" / "\u8868\u683c\u8fd0\u7528.mp4",
]


def safe_text(value: str, limit: int = 1200) -> str:
    return value.replace("\x00", "").strip()[:limit]


def extract_text_materials() -> list[dict[str, object]]:
    extractor = ExtractionService()
    records: list[dict[str, object]] = []
    for path in TEXT_FILES:
        if not path.exists():
            records.append({"file": str(path), "status": "missing"})
            continue
        if path.suffix.lower() == ".md":
            content = path.read_text(encoding="utf-8", errors="ignore")
            records.append(
                {
                    "file": str(path),
                    "status": "read",
                    "fragment_count": 1,
                    "sample": safe_text(content, 3000),
                }
            )
            continue
        fragments = extractor.extract(str(path), path.name)
        text_fragments = [fragment for fragment in fragments if fragment.kind != "ocr_pending"]
        records.append(
            {
                "file": str(path),
                "status": "read",
                "fragment_count": len(text_fragments),
                "pending_ocr_count": sum(1 for fragment in fragments if fragment.kind == "ocr_pending"),
                "sample": safe_text("\n".join(fragment.text for fragment in text_fragments), 4000),
            }
        )
    return records


def video_duration(path: Path) -> float | None:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nokey=1:noprint_wrappers=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def extract_keyframes() -> list[dict[str, object]]:
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, object]] = []
    for index, path in enumerate(VIDEO_FILES, start=1):
        if not path.exists():
            records.append({"file": str(path), "status": "missing"})
            continue
        duration = video_duration(path)
        video_dir = FRAME_DIR / f"{index:02d}-{path.stem[:20]}"
        video_dir.mkdir(parents=True, exist_ok=True)
        timestamps = [10, 60, 180, 360, 600]
        if duration:
            timestamps = sorted({min(max(3, int(duration * ratio)), max(3, int(duration) - 2)) for ratio in [0.08, 0.22, 0.42, 0.66, 0.88]})
        frames: list[str] = []
        for frame_index, timestamp in enumerate(timestamps, start=1):
            output = video_dir / f"frame-{frame_index:02d}-{timestamp}s.jpg"
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    str(timestamp),
                    "-i",
                    str(path),
                    "-frames:v",
                    "1",
                    "-q:v",
                    "3",
                    str(output),
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
                check=False,
            )
            if output.exists() and output.stat().st_size > 0:
                frames.append(str(output))
            elif result.stderr:
                frames.append(f"failed:{timestamp}s")
        records.append(
            {
                "file": str(path),
                "status": "keyframes_extracted",
                "duration_seconds": duration,
                "frames": frames,
                "note": "Keyframes are visual evidence only; no speech transcript has been extracted.",
            }
        )
    return records


def write_report(text_records: list[dict[str, object]], video_records: list[dict[str, object]]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report = OUT_DIR / "sandbox-logic-learning-report.md"
    report.write_text(
        "\n".join(
            [
                "# 沙盘逻辑资料学习记录",
                "",
                "## 已学习文本资料",
                *[
                    f"- {Path(str(item['file'])).name}: {item.get('status')}，片段 {item.get('fragment_count', 0)}，OCR待确认 {item.get('pending_ocr_count', 0)}"
                    for item in text_records
                ],
                "",
                "## 已抽帧视频资料",
                *[
                    f"- {Path(str(item['file'])).name}: {item.get('status')}，时长 {round(item['duration_seconds'] or 0, 1)} 秒，关键帧 {len(item.get('frames', []))} 张"
                    for item in video_records
                ],
                "",
                "## 当前已吸收的方案推演逻辑",
                "",
                "1. 先提取规则变量，不从经验拍结论：初始现金、融资、产线、研发、原料、管理费、组数、市场出现时间。",
                "2. 市场先算容量和毛利：产品毛利按售价减材料费，容量必须折成组均需求后反推产能。",
                "3. 产线选择按参数判定：比较自动/智能安装期、满激励产能、转产周期和转产费；自动线不是名字上禁止转产，而是看规则是否有转产周期。",
                "4. Y1的核心是权益放大：用短贷和贴现跑通现金流，尽量形成利润和年末权益，为Y2贷款额度打开空间。",
                "5. P3/P4研发要提前：如果Y2或Y3有爆发利润，必须在Y1Q1启动，不等订单出现。",
                "6. 拆线/转产不是口号：用追加投入、停工损失、账面损失与剩余季利润差计算净盈亏。",
                "7. 广告不是固定值：先判断产能、订单毛利、竞争强度和现金流，Y1够卖即可，Y3/Y4高毛利阶段加压。",
                "8. 每个季度必须现金校验：季末现金要覆盖下季工资、维护、管理、到期本息、原料和税。",
                "",
                "## 视频学习边界",
                "",
                "本次已完成关键帧抽取，可学习画面中的表格结构、流程节点和操作界面。尚未完成语音转写，因此视频口播内容不能作为最终规则证据，只能作为待复核线索。",
            ]
        ),
        encoding="utf-8",
    )
    (OUT_DIR / "sandbox-logic-learning-raw.json").write_text(
        json.dumps({"text": text_records, "videos": video_records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    text_records = extract_text_materials()
    video_records = extract_keyframes()
    write_report(text_records, video_records)
    print(f"wrote {OUT_DIR / 'sandbox-logic-learning-report.md'}")
    print(f"text_files={len(text_records)} videos={len(video_records)}")


if __name__ == "__main__":
    main()
