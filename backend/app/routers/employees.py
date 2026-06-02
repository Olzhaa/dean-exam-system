from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import io
import pandas as pd

from .. import models, schemas
from ..database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=List[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), _user=Depends(require_admin)):
    return db.query(models.Employee).order_by(models.Employee.name).all()


@router.post("", response_model=schemas.EmployeeOut)
def create_employee(payload: schemas.EmployeeCreate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = models.Employee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.put("/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(emp_id: int, payload: schemas.EmployeeUpdate, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = db.query(models.Employee).get(emp_id)
    if not emp:
        raise HTTPException(404, "Қызметкер табылмады")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


@router.post("/{emp_id}/toggle-active", response_model=schemas.EmployeeOut)
def toggle_active(emp_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = db.query(models.Employee).get(emp_id)
    if not emp:
        raise HTTPException(404, "Қызметкер табылмады")
    emp.is_active = not emp.is_active
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db), _user=Depends(require_admin)):
    emp = db.query(models.Employee).get(emp_id)
    if not emp:
        raise HTTPException(404, "Қызметкер табылмады")
    db.delete(emp)
    db.commit()
    return {"ok": True}


@router.post("/import", response_model=schemas.EmployeeImportResult)
async def import_employees(file: UploadFile = File(...), db: Session = Depends(get_db), _user=Depends(require_admin)):
    """Excel/CSV columns: name, department (optional), min_proctor_count (optional), max_proctor_count (optional)"""
    content = await file.read()
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Файл оқылмады: {e}")

    df.columns = [str(c).strip().lower() for c in df.columns]
    if "name" not in df.columns:
        raise HTTPException(400, "Міндетті баған: 'name'. Қосымша: department, min_proctor_count, max_proctor_count")

    added = 0
    skipped = 0
    errors: list[str] = []
    for i, row in df.iterrows():
        try:
            full_name = str(row.get("name", "")).strip()
            if not full_name or full_name.lower() == "nan":
                skipped += 1
                continue
            # skip if exists
            if db.query(models.Employee).filter(models.Employee.name == full_name).first():
                skipped += 1
                continue
            dept = str(row.get("department", "")).strip()
            if dept.lower() == "nan":
                dept = ""
            min_c = row.get("min_proctor_count", 0)
            max_c = row.get("max_proctor_count", 10)
            try:
                min_c = int(min_c) if pd.notna(min_c) else 0
                max_c = int(max_c) if pd.notna(max_c) else 10
            except Exception:
                min_c, max_c = 0, 10
            emp = models.Employee(
                name=full_name,
                department=dept,
                is_active=True,
                min_proctor_count=min_c,
                max_proctor_count=max_c,
            )
            db.add(emp)
            added += 1
        except Exception as e:
            errors.append(f"Жол {i+2}: {e}")
    db.commit()
    return schemas.EmployeeImportResult(added=added, skipped=skipped, errors=errors[:10])
