export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const results = [];
    let cursor;
    do {
      const resp = await fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_RECURRING_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_cursor: cursor,
            page_size: 100,
            sorts: [{ property: "每月扣款日", direction: "ascending" }],
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        res.status(502).json({ error: errText });
        return;
      }

      const data = await resp.json();
      results.push(...data.results);
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const recurring = results
      .map((page) => {
        const p = page.properties;
        return {
          name: p["名稱"]?.title?.[0]?.plain_text || "",
          amount: p["金額"]?.number || 0,
          person: p["成員"]?.select?.name || "",
          payer: p["付款人"]?.select?.name || "",
          category: p["類別"]?.select?.name || "其他",
          dueDay: p["每月扣款日"]?.number || null,
          reminderDays: p["提前提醒天數"]?.number ?? 3,
          active: p["啟用中"]?.checkbox ?? true,
          note: p["備註"]?.rich_text?.[0]?.plain_text || "",
        };
      })
      .filter((r) => r.name);

    res.status(200).json({ syncTime: new Date().toISOString(), recurring });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
