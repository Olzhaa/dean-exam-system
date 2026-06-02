# Деканат: Емтихан және прокторинг жүйесі

Деканат қызметкерлерінің жұмысын автоматтандыруға арналған толық стек жүйе:
- **1-модуль:** Прокторларды Final емтихандарға автоматты бөлу (min/max лимиттер + уақыт қиылысын тексеру).
- **2-модуль:** FX (қайта тапсыру) кестесін CSP backtracking алгоритмімен автогенерациялау.

## Технологиялар
- **Backend:** Python 3.10+ • FastAPI • SQLAlchemy • SQLite (PostgreSQL-ге ауысуға дайын)
- **Frontend:** React 18 + Vite + React Router
- **Excel I/O:** pandas + openpyxl

---

## 🚀 Іске қосу

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend: http://localhost:8000 — Swagger docs: http://localhost:8000/docs

Бірінші іске қосылғанда `dean_exam.db` файлы автоматты жасалады және `admin/admin123` тіркелгісі сидқа отырғызылады.

### 2. Frontend

Жаңа терминалда:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 — `/api` сұраулары backend-ке проксиленеді.

---

## 🔑 Кіру

| Логин | Құпиясөз | Рөл |
|---|---|---|
| `admin` | `admin123` | админ — толық дос­тұп |

Студенттер мен қызметкерлер үшін user-рөлді тіркелгілерді кейін қосуға болады.

---

## 📋 Қолдану жолы

### 1-модуль: Прокторларды бөлу
1. **Қызметкерлер** бетінде Т.А.Ә., min/max лимиттерді енгізіңіз.
2. **Емтихандар** бетінде Final емтихандарды қосыңыз.
3. **Проктор бөлу** бетінде «🤖 Автоматты бөлу» түймесін басыңыз.
   - Жүйе min лимитке жетпеген қызметкерлерге басымдық береді.
   - Max лимитке жеткен қызметкерлер бұғатталады.
   - Уақыт қиылысы тексеріледі.
4. Қажет болса қолмен қосу/алып тастауға болады.

### 2-модуль: FX кестесі
1. **Кабинеттер** бетінде FX үшін бос кабинеттерді сыйымдылықпен қосыңыз.
2. **FX өтініштер** бетінде:
   - **Импорт:** Excel/CSV файлды жүктеңіз (бағандар: `student_code`, `student_name`, `course_code`).
   - Немесе қолмен қосыңыз.
3. **FX кесте** бетінде:
   - Күн интервалын беріңіз (мысалы 15.06.2026 – 18.06.2026).
   - Уақыт интервалдарын (мысалы `09:00, 11:30, 14:30`).
   - «⚡ Генерациялау» түймесі CSP backtracking арқылы конфликтсіз кесте құрады.
4. «📥 Excel жүктеу» — толық кестені Excel файлы ретінде экспорттау.
5. **Студент іздеу** — студент өз кодын енгізіп жеке кестесін көреді (аутентификациясыз).

---

## 🗄 Дерекқор кестелері

| Кесте | Сипаттама |
|---|---|
| `users` | админ/user тіркелгілер |
| `employees` | қызметкерлер + min/max/current_proctor_count |
| `exams` | Final емтихандар |
| `proctor_assignments` | қызметкер ↔ емтихан байланысы |
| `rooms` | FX кабинеттері (нөмір + сыйымдылық) |
| `students` | FX тапсыратын студенттер |
| `fx_requests` | (студент, пән) өтініштер |
| `fx_exams` | құрылған FX кестесінің жолдары |
| `fx_student_assignments` | FX-те қай студент қай емтиханда |

## 🔁 PostgreSQL-ге ауысу

`backend/.env` (немесе ортада) қойыңыз:
```
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/dean_exam
```
`pip install psycopg2-binary` қосыңыз. SQLAlchemy моделдер өзгеріссіз жұмыс істейді.

---

## 📁 Жоба құрылымы

```
EMLight-master/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── database.py
│   │   ├── models.py            # SQLAlchemy ORM
│   │   ├── schemas.py           # Pydantic
│   │   ├── auth.py              # JWT + password hash + seed_admin
│   │   ├── algorithms/
│   │   │   ├── proctor_assignment.py  # min/max + time-conflict
│   │   │   └── fx_scheduler.py        # CSP backtracking
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── employees.py
│   │       ├── exams.py
│   │       ├── proctors.py
│   │       ├── rooms.py
│   │       └── fx.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Employees.jsx
    │       ├── Exams.jsx
    │       ├── ProctorAssign.jsx
    │       ├── Rooms.jsx
    │       ├── FxRequests.jsx
    │       ├── FxSchedule.jsx
    │       └── StudentLookup.jsx
    └── package.json
```
