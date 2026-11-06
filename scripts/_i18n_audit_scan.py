#!/usr/bin/env python3
# One-off audit scanner for remaining English UI strings (Cascadia i18n).
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import re

ROOT = Path("/Users/tongguowen/cascadia-i18n/cascadia-web/src")
OUT = Path(
    "/Users/tongguowen/Downloads/Watchlink工作/_watchlink-governance/docs/draft/"
    "AUDIT-20261102-cascadia-i18n-全面残留.md"
)

PATTERNS: dict[str, re.Pattern[str]] = {
    "DialogTitle": re.compile(
        r"<DialogTitle[^>]*>\s*([A-Za-z][^<{]{1,80}?)(?:</DialogTitle>)"
    ),
    "AlertDialogTitle": re.compile(
        r"<AlertDialogTitle[^>]*>\s*([A-Za-z][^<{]{1,80}?)(?:</)"
    ),
    "SheetTitle": re.compile(
        r"<SheetTitle[^>]*>\s*([A-Za-z][^<{]{1,80}?)(?:</)"
    ),
    "CardTitle_inline": re.compile(
        r"<CardTitle[^>]*>\s*([A-Za-z][A-Za-z0-9 ,./&'-]{1,60})\s*<"
    ),
    "Label_inline": re.compile(
        r"<Label[^>]*>\s*([A-Za-z][A-Za-z0-9 /&'-]{1,40})\s*</Label>"
    ),
    "Button_text": re.compile(
        r"<Button[^>]*>\s*([A-Z][A-Za-z0-9 ]{2,40})\s*</Button>"
    ),
    "TabsTrigger": re.compile(
        r"<TabsTrigger[^>]*>\s*([A-Za-z][^<{]{1,40})</TabsTrigger>"
    ),
    "SelectItem": re.compile(
        r"<SelectItem[^>]*>\s*([A-Za-z][^<{]{1,40})</SelectItem>"
    ),
    "Badge_text": re.compile(
        r"<Badge[^>]*>\s*([A-Z][A-Za-z0-9 -]{1,30})\s*</Badge>"
    ),
    "h_heading": re.compile(
        r"<h[1-4][^>]*>\s*([A-Za-z][^<{]{2,60})</h[1-4]>"
    ),
    "placeholder": re.compile(r"""placeholder=["']([A-Za-z][^"']{1,80})["']"""),
    "aria_label": re.compile(r"""aria-label=["']([A-Za-z][^"']{1,80})["']"""),
    "title_attr": re.compile(r"""\btitle=["']([A-Za-z][^"']{3,100})["']"""),
    "handleError_title": re.compile(
        r"""handleError\([^)]*?title:\s*['"]([^'"]+)['"]""", re.S
    ),
    "confirm_title": re.compile(
        r"""confirm\(\s*\{[^}]*?title:\s*['"]([^'"]+)['"]""", re.S
    ),
    "alert_title": re.compile(
        r"""alert\(\s*\{[^}]*?title:\s*['"]([^'"]+)['"]""", re.S
    ),
    "confirm_description": re.compile(
        r"""(?:confirm|alert)\(\s*\{[^}]*?description:\s*['"]([^'"]{8,160})['"]""",
        re.S,
    ),
}

MULTILINE_TITLE = re.compile(
    r"<(CardTitle|DialogTitle|CardDescription|AlertDialogDescription)([^>]*)>"
    r"\s*\n\s*([A-Za-z][^\n<{]{2,100})"
)

PHRASE_PREFIXES = (
    "No ",
    "Nothing ",
    "Loading ",
    "Failed to ",
    "Are you sure ",
    "Could not ",
    "Please ",
    "Search ",
    "Select ",
    "Create ",
    "Delete ",
    "Edit ",
    "Add ",
    "Remove ",
    "Upload ",
    "Download ",
    "Save ",
    "Cancel ",
    "Submit ",
    "Approve ",
    "Reject ",
    "View ",
    "Open ",
    "Close ",
    "Continue ",
    "Back ",
    "Next ",
    "Skip ",
    "Reset ",
    "Enable ",
    "Disable ",
    "Update ",
    "Rotate ",
    "Revoke ",
    "Check out ",
    "Check in ",
    "Force ",
    "Waive ",
    "Pull ",
    "Link ",
    "Register ",
    "Commit ",
    "Rename ",
    "Compare ",
    "Detach ",
    "Affirm ",
)
EMPTY_RE = re.compile(
    r"""['"]((?:"""
    + "|".join(re.escape(p) for p in PHRASE_PREFIXES)
    + r""")[^'"]{0,100})['"]"""
)


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def main() -> None:
    tsx_files = [
        p
        for p in ROOT.rglob("*.tsx")
        if ".test." not in p.name and "node_modules" not in str(p)
    ]

    results: dict[str, list[tuple[str, int, str]]] = defaultdict(list)
    no_i18n: list[str] = []
    has_i18n: list[str] = []

    for p in tsx_files:
        text = p.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        uses_i18n = (
            "useTranslation" in text
            or "react-i18next" in text
            or "from '@/i18n'" in text
        )
        if uses_i18n:
            has_i18n.append(rel(p))

        hits_any = False
        for name, pat in PATTERNS.items():
            for m in pat.finditer(text):
                s = m.group(1).strip()
                if not s or s.startswith("http") or s.startswith("/") or "{" in s:
                    continue
                pre = text[max(0, m.start() - 100) : m.start()]
                if name in {"Button_text", "DialogTitle"} and "sr-only" in pre and s == "Close":
                    continue
                line_no = text[: m.start()].count("\n") + 1
                results[name].append((rel(p), line_no, s[:120]))
                hits_any = True

        for m in MULTILINE_TITLE.finditer(text):
            tag, content = m.group(1), m.group(3).strip()
            if content and not content.startswith("//"):
                line_no = text[: m.start()].count("\n") + 1
                results[f"multiline_{tag}"].append((rel(p), line_no, content[:120]))
                hits_any = True

        for m in EMPTY_RE.finditer(text):
            s = m.group(1).strip()
            if "SPDX" in s or "Copyright" in s:
                continue
            line_no = text[: m.start()].count("\n") + 1
            if line_no <= len(lines):
                line_txt = lines[line_no - 1].strip()
                if line_txt.startswith("//") or line_txt.startswith("*"):
                    continue
            results["string_phrase"].append((rel(p), line_no, s[:120]))
            hits_any = True

        if hits_any and not uses_i18n:
            no_i18n.append(rel(p))

    seen: set[tuple[str, str]] = set()
    deduped: list[tuple[str, int, str]] = []
    for item in results["string_phrase"]:
        key = (item[0], item[2])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    results["string_phrase"] = deduped

    order = [
        "DialogTitle",
        "multiline_DialogTitle",
        "AlertDialogTitle",
        "SheetTitle",
        "CardTitle_inline",
        "multiline_CardTitle",
        "multiline_CardDescription",
        "Label_inline",
        "Button_text",
        "TabsTrigger",
        "SelectItem",
        "Badge_text",
        "h_heading",
        "placeholder",
        "aria_label",
        "title_attr",
        "handleError_title",
        "confirm_title",
        "alert_title",
        "confirm_description",
        "string_phrase",
    ]

    out_lines: list[str] = []
    out_lines += [
        "# Cascadia i18n 全面残留扫描",
        "",
        "| 项 | 值 |",
        "|----|----|",
        "| 日期 | 2026-11-02 |",
        "| 源码 | `~/cascadia-i18n` / `cascadia-web/src` |",
        "| 方法 | 正则 + 多行标题 + 常见英文短语；**非 AST**，有噪声 |",
        "| 范围 | `*.tsx`（排除 `*.test.tsx`） |",
        "",
        "## 总览计数",
        "",
        "| 类别 | 命中数 |",
        "|------|--------|",
    ]

    total = 0
    for k in order:
        n = len(results.get(k, []))
        if n:
            out_lines.append(f"| `{k}` | {n} |")
            total += n
    out_lines += [
        f"| **合计（含噪声）** | **{total}** |",
        f"| 已用 i18n 的 tsx 文件 | {len(has_i18n)} |",
        f"| **有英文命中且未接 i18n 的文件** | **{len(set(no_i18n))}** |",
        "",
        "> 币种代码、技术标识、文档式注释会进噪声；优先看 Dialog / 报错 / Select / 未接 i18n 文件。",
        "",
        "## A. 未接 i18n 且有英文命中的文件",
        "",
    ]
    for f in sorted(set(no_i18n)):
        out_lines.append(f"- `{f}`")
    out_lines.append("")

    for k in order:
        items = results.get(k, [])
        if not items:
            continue
        out_lines += [f"## {k}（{len(items)}）", ""]
        by: dict[str, list[tuple[int, str]]] = defaultdict(list)
        for f, line, s in items:
            by[f].append((line, s))
        for f in sorted(by):
            out_lines.append(f"### `{f}`")
            rows = by[f]
            for line, s in rows[:50]:
                safe = s.replace("|", "\\|")
                out_lines.append(f"- L{line}: `{safe}`")
            if len(rows) > 50:
                out_lines.append(f"- … 另有 {len(rows) - 50} 条")
            out_lines.append("")

    out_lines += [
        "## 建议清理顺序（M3）",
        "",
        "1. **DialogTitle / confirm / handleError** — 用户一点就看见",
        "2. **未接 i18n 的整文件**（作业指导书、CAD、软件源码、需求链接、API Key、工作区等）",
        "3. **SelectItem 枚举显示名**",
        "4. **placeholder / title / aria-label / 空态加载句**",
        "5. **种子数据与服务端 message** — 另任务",
        "",
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(out_lines), encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"total_hits={total} no_i18n_files={len(set(no_i18n))} has_i18n={len(has_i18n)}")
    for k in order:
        n = len(results.get(k, []))
        if n:
            print(f"  {k}: {n}")


if __name__ == "__main__":
    main()
