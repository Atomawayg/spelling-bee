# ส่งต่องาน Spelling Bee ม.ต้น (25 พ.ย. 2569)

## สถานะล่าสุด
- เว็บ: https://spellingbee-rattanabundit.netlify.app · หน้าครู: /teacher.html (รหัสครูตั้งไว้ใน Netlify env `TEACHER_PIN`)
- คำศัพท์ทั้งหมด **3,990 คำ**: คำแข่ง 20 · B1 2,796 · B2 162 · C1 914 · สะกดยาก 98
  - รอบนี้เพิ่มคำจากไฟล์ต้นฉบับกลับมา 1,983 คำ (ส่วนใหญ่เป็น B1 จาก Cambridge B1 Preliminary list)
  - คำ C1 ที่เกี่ยวกับความรุนแรง อาชญากรรม และเรื่องทางเพศ ยังคงตัดออกไว้ เพราะไม่เหมาะกับเด็ก
  - ไม่ได้ใส่วลีกริยา (เช่น get up) วลีบุพบท และคำย่อ (เช่น CD, Mr) เพราะไม่ใช่คำที่ใช้แข่งสะกด
- เสียง: Jenny (Microsoft, ช้าลง 10%) สร้างจากฝั่งเซิร์ฟเวอร์ Netlify

## งานที่อาจค้างอยู่
- [ ] ตรวจว่าเสียงของคำใหม่สร้างเสร็จแล้ว: เปิด /api/audio/status.json ต้องเป็น `"phase":"ready"` และ total = 7997
- [ ] ครูลองใช้บน iPad จริง ทั้งการเขียนด้วย Apple Pencil และเสียง
- [ ] คำอ่านไทย คำแปล และประโยคตัวอย่างของคำที่เพิ่มรอบนี้ Claude เขียนเอง ครูควรสุ่มตรวจบางส่วน

## วิธีทำงานต่อใน Claude Code
1. Clone repo `Atomawayg/spelling-bee` แล้วอ่าน `CLAUDE.md` (มีโครงสร้างโปรเจกต์และวิธี build/deploy ครบ)
2. แก้แอปที่ `src/template.html` → รัน `python3 src/build.py` → commit → push (Netlify deploy เองอัตโนมัติ)
3. เพิ่มคำ: ต่อท้าย `netlify/functions/lib/words.json` แล้วสั่งสร้างเสียง (ดูวิธีใน CLAUDE.md)
