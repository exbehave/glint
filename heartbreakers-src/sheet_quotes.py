# Usage: export the quotes spreadsheet as xlsx (Drive download JSON with base64 content), then: python3 sheet_quotes.py <download.json>
# Writes quotes_sheet.json; upsert it into hb_quotes and lines.js.
# Sheet (xlsx export) -> {girl: {moment: [lines]}} for every girl tab that has at least one quote.
import openpyxl, json, sys, base64
src = json.load(open(sys.argv[1]))
open('sheet_now.xlsx', 'wb').write(base64.b64decode(src['content']))
wb = openpyxl.load_workbook('sheet_now.xlsx')
M = {'Plays the Queen of Spades': 'qsGive', 'Dumps the Queen of Spades': 'qsGive', 'Gets stuck with the Queen of Spades': 'qsGet', 'Breaks hearts': 'breaks', 'Takes a small hit': 'fewHearts',
     'Takes a big hit': 'hearts', 'Shoots the moon': 'moon', 'Wins the game': 'win'}
NAME = {'Victors': 'Victor Twins', 'Victor Twins': 'Victor Twins'}
out, odd = {}, []
for ws in wb.worksheets:
    if ws.title == 'Roster': continue
    head = ws.cell(1, 1).value
    girl = NAME.get(ws.title) or NAME.get(str(head)) or (str(head).strip() if head and not str(head).startswith('Name') else ws.title)
    cur, got = None, {}
    for r in ws.iter_rows(values_only=True):
        if r[0] == 'Moment': cur = M.get(r[1]); got.setdefault(cur, [])
        elif cur and str(r[0] or '').startswith('Quote') and r[1] is not None and str(r[1]).strip():
            q = ' '.join(str(r[1]).split())
            # column C is the Status dropdown (Nov 7, 2026): an Unusable quote never reaches the game
            if len(r) > 2 and str(r[2] or '').strip().lower() == 'unusable': odd.append((girl, cur, q + ' [unusable]')); continue
            if len(q) < 4 and not q.endswith(('!', '?', '.')): odd.append((girl, cur, q)); continue
            got[cur].append(q)
    if any(got.values()): out[girl] = got
json.dump(out, open('quotes_sheet.json', 'w'), ensure_ascii=False, indent=1)
print('girls:', list(out)); print('skipped:', odd)
