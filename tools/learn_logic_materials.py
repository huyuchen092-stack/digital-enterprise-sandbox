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


TEXT_EXTENSIONS = {".md", ".docx", ".pdf", ".pptx", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".bmp", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}


def safe_text(value: str, limit: int = 1200) -> str:
    return value.replace("\x00", "").strip()[:limit]


def discover_files(extensions: set[str]) -> list[Path]:
    files: list[Path] = []
    if ".md" in extensions:
        files.append(Path.home() / "Desktop" / "\u65b9\u6848\u63a8\u6f14AI.md")
    files.extend(path for path in LOGIC_DIR.rglob("*") if path.is_file() and path.suffix.lower() in extensions)
    seen: set[str] = set()
    unique: list[Path] = []
    for path in files:
        key = str(path).lower()
        if key not in seen:
            unique.append(path)
            seen.add(key)
    return sorted(unique, key=lambda item: str(item))


def topic_for_path(path: Path) -> str:
    text = str(path)
    mapping = [
        ("\u62c6\u7ebf", "\u62c6\u7ebf/\u6362\u7ebf"),
        ("\u751f\u4ea7\u7ebf", "\u4ea7\u7ebf\u89c4\u5219"),
        ("\u8d37\u6b3e", "\u878d\u8d44"),
        ("\u8d34\u73b0", "\u8d34\u73b0/\u5e94\u6536"),
        ("\u539f\u6750\u6599", "\u539f\u6599/BOM"),
        ("\u6750\u6599", "\u539f\u6599/BOM"),
        ("\u5e7f\u544a", "\u5e7f\u544a/\u9009\u5355"),
        ("\u5e02\u573a", "\u5e02\u573a\u5206\u6790"),
        ("\u4ea7\u54c1", "\u4ea7\u54c1/\u7814\u53d1"),
        ("\u73ed\u6b21", "\u73ed\u6b21/\u6fc0\u52b1"),
        ("\u6fc0\u52b1", "\u73ed\u6b21/\u6fc0\u52b1"),
        ("\u5de5\u4eba", "\u4eba\u529b/\u5de5\u8d44"),
        ("\u4eba\u529b", "\u4eba\u529b/\u5de5\u8d44"),
        ("\u8868\u683c", "\u9884\u7b97\u8868"),
        ("\u8d22\u52a1", "\u8d22\u52a1/\u62a5\u8868"),
        ("\u798f\u5efa", "\u798f\u5efa\u89c4\u5219"),
        ("\u5927\u6d77", "\u5927\u6d77\u6848\u4f8b"),
        ("\u5409\u6797", "\u5409\u6797\u6848\u4f8b"),
    ]
    for needle, topic in mapping:
        if needle in text:
            return topic
    return "\u7efc\u5408"


def extract_text_materials() -> list[dict[str, object]]:
    extractor = ExtractionService()
    records: list[dict[str, object]] = []
    for path in discover_files(TEXT_EXTENSIONS):
        if not path.exists():
            records.append({"file": str(path), "status": "missing"})
            continue
        if path.suffix.lower() == ".md":
            content = path.read_text(encoding="utf-8", errors="ignore")
            records.append(
                {
                    "file": str(path),
                    "topic": topic_for_path(path),
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
                "topic": topic_for_path(path),
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
    for index, path in enumerate(discover_files(VIDEO_EXTENSIONS), start=1):
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
                "topic": topic_for_path(path),
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
                    f"- [{item.get('topic')}] {Path(str(item['file'])).name}: {item.get('status')}，片段 {item.get('fragment_count', 0)}，OCR待确认 {item.get('pending_ocr_count', 0)}"
                    for item in text_records
                ],
                "",
                "## 已抽帧视频资料",
                *[
                    f"- [{item.get('topic')}] {Path(str(item['file'])).name}: {item.get('status')}，时长 {round(item['duration_seconds'] or 0, 1)} 秒，关键帧 {len(item.get('frames', []))} 张"
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
                "## 算法化推演模型 v2",
                "",
                "1. 变量层：先确认初始现金/权益、贷款倍数与利率、管理费、产线价格/周期/产量/转产周期、产品研发周期、原料 BOM 与送货期、市场开拓/ISO/特性规则、参赛组数。缺失或 OCR 模糊时只列待确认，不进入最终计算。",
                "2. 市场层：按年、季度、市场、产品、特性汇总订单；总容量除以参赛组数得到组均容量；产品利润只按售价减材料费用作为第一口径毛利；识别 Y2/Y3/Y4 的需求和毛利爆发点。",
                "3. 产能层：用组均容量反推线数，再受产线安装期、生产期、上限、工人效率、班次、原料到货和现金约束校验。自动线是否转产只看规则表是否有转产周期和转产成本，不按名字一刀切。",
                "4. 现金流层：每季列期初现金、贷款、贴现、回款、产线、研发、市场/ISO、原料、工资、管理费、维护、利息、本金、税、期末现金。现金为负或不能覆盖下季刚性支出时，方案必须减线、调融资或降低广告。",
                "5. 决策层：Y1 目标是跑通现金流并放大权益；Y2 补齐高毛利产品/市场/产能；Y3-Y4 围绕高毛利订单、可交付产能和广告效率扩大权益。所有推荐都要带证据来源和待复核项。",
                "6. 边界层：视频关键帧只能确认表格结构、操作流程和待复核线索；没有语音转写或清晰表格 OCR 的具体数值，不作为规则证据。",
                "",
                "## 视频学习边界",
                "",
                "本次已完成关键帧抽取，可学习画面中的表格结构、流程节点和操作界面。尚未完成语音转写，因此视频口播内容不能作为最终规则证据，只能作为待复核线索。",
                "",
                "## 视频关键帧已确认内容",
                "",
                "关键帧联系表：`docs/knowledge/video-keyframes-contact-sheet.jpg`",
                "",
                "1. 福建规则视频展示的是带颜色区块的经营预算/经营过程表，重点是把年度、季度、现金、贷款、应收、综合费用、资产负债等放在一张表里联动检查。",
                "2. 拆线视频展示的是表格化拆线推演：把不同产线/时点放在横向季度轴上，计算拆线或替换的成本收益。可确认“拆线必须表格算净盈亏”，不能口头判断。",
                "3. 生产线系列视频展示了生产线规则页和 Excel 产能表：产线价格、安装周期、生产周期、产量、转产周期、转产费用、残值、维护、折旧、工人配置都必须入表。",
                "4. 贷款规则视频展示贷款规则页和季度表：贷款时间、额度倍数、利率、还款方式要进入现金流，不能只看能贷多少。",
                "5. 贴现视频展示应收/贴现和季度现金表：贴现是现金流工具，应用于缺钱季节，不是固定操作。",
                "6. 原材料视频展示原料表和产品 BOM：原料价格、送货周期、账期、紧急采购倍数决定能不能按时生产，尤其 2 季到货原料要提前下单。",
                "7. 广告组成视频展示广告/市场/订单相关表格：广告要和订单容量、产品毛利、竞争强度、可交付产能一起判断，Y1不是无脑高广告。",
                "8. 表格制作和表格运用视频展示预算表结构：方案应输出季度级表格，至少包含现金、短贷/利息、贴现、研发、市场/ISO、产线建设、原料、工资、广告、收入、税和期末现金校验。",
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
