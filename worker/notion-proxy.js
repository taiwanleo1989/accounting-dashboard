export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const results = [];
      let cursor;
      do {
        const resp = await fetch(
          `https://api.notion.com/v1/databases/${env.NOTION_DATABASE_ID}/query`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.NOTION_TOKEN}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              start_cursor: cursor,
              page_size: 100,
              sorts: [{ property: "日期", direction: "descending" }],
            }),
          }
        );

        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ error: errText }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await resp.json();
        results.push(...data.results);
        cursor = data.has_more ? data.next_cursor : undefined;
      } while (cursor);

      const expenses = results
        .map((page) => {
          const p = page.properties;
          return {
            date: p["日期"]?.date?.start?.slice(0, 10) || "",
            name: p["名稱"]?.title?.[0]?.plain_text || "",
            category: p["類別"]?.select?.name || "其他",
            person: p["成員"]?.select?.name || "",
            amount: p["金額"]?.number || 0,
          };
        })
        .filter((e) => e.date && e.name);

      return new Response(
        JSON.stringify({ syncTime: new Date().toISOString(), expenses }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
