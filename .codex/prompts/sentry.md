---
description: Sentry issue ID or event ID investigation workflow.
---
Sentry issue IDまたはevent IDを調査してください: $ARGUMENTS

以下の手順で調査を行ってください：

1. `mcp__sentry__find_organizations` でorganization情報を取得
2. `mcp__sentry__get_issue_details` でissue/eventの詳細を取得
3. 問題の概要、発生箇所、スタックトレース、影響範囲を報告
4. 可能であれば、コードベースを調査して修正案を提示
