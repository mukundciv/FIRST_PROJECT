import os
import io
import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.cloud.firestore as firestore
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
from fastapi.staticfiles import StaticFiles
import uuid
import json
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Load local .env file if it exists (for local development)
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key.strip()] = val.strip()

cloudinary.config(
  cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME"),
  api_key = os.environ.get("CLOUDINARY_API_KEY"),
  api_secret = os.environ.get("CLOUDINARY_API_SECRET"),
  secure = True
)

app = FastAPI(title='StudentOS API', version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:8000', 'http://127.0.0.1:8000',
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:8080', 'http://127.0.0.1:8080',
        'http://localhost:8081', 'http://127.0.0.1:8081',
        'https://vnitstudenttos.netlify.app',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
COLLECTION_NAME  = 'studentos_user_data'

def get_google_clients():
    # 1. Try loading from environment variable (secure production method)
    firebase_creds_env = os.environ.get("FIREBASE_CREDENTIALS")
    if firebase_creds_env:
        try:
            creds_info = json.loads(firebase_creds_env)
            # Fix double-escaped newlines commonly caused by cloud dashboard environment editors
            if "private_key" in creds_info:
                creds_info["private_key"] = creds_info["private_key"].replace("\\n", "\n")
                
            creds = service_account.Credentials.from_service_account_info(
                creds_info,
                scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/drive'],
            )
            db_client = firestore.Client(credentials=creds, project=creds.project_id, database="studentos")
            drive_client = build('drive', 'v3', credentials=creds)
            return db_client, drive_client
        except Exception as e:
            print(f"Error initializing from FIREBASE_CREDENTIALS env var: {e}")

    # 2. Fallback to local file (for local development)
    if not os.path.exists(CREDENTIALS_PATH):
        raise FileNotFoundError(
            f'serviceAccountKey.json not found at {CREDENTIALS_PATH}. '
            'Download it from: Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key.'
        )
    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/drive'],
    )
    db_client = firestore.Client(credentials=creds, project=creds.project_id, database="studentos")
    drive_client = build('drive', 'v3', credentials=creds)
    return db_client, drive_client

try:
    db, drive = get_google_clients()
    print('Firestore and Drive connected successfully.')
except Exception as exc:
    db = None
    drive = None
    print(f'Google Cloud services not available: {exc}')


class Task(BaseModel):
    id:          str
    title:       str
    description: Optional[str] = ''
    category:    Optional[str] = 'Custom'
    deadline:    Optional[str] = None
    completed:   bool          = False
    bookmarked:  bool          = False
    createdAt:   Optional[str] = None


class TasksPayload(BaseModel):
    tasks: List[Task] = Field(default_factory=list)


class CalendarEvent(BaseModel):
    id:          int
    name:        str
    date:        str
    description: Optional[str] = ''
    bookmarked:  bool          = False


class CalendarPayload(BaseModel):
    events: List[CalendarEvent] = Field(default_factory=list)


def _safe_key(email: str) -> str:
    return email.strip().lower().replace('.', '_').replace('@', '__at__')


def _require_db():
    if db is None:
        raise HTTPException(status_code=503, detail='Firestore not connected. Add serviceAccountKey.json to studentos-backend/.')


@app.get('/')
def root():
    return {'status': 'StudentOS API is running', 'firestore': db is not None}


@app.get('/api/tasks/{user_email}', response_model=List[Task])
def get_tasks(user_email: str):
    _require_db()
    doc = db.collection(COLLECTION_NAME).document(_safe_key(user_email)).get()
    if not doc.exists:
        return []
    validated = []
    for item in doc.to_dict().get('tasks', []):
        try:
            validated.append(Task(**item))
        except Exception:
            pass
    return validated


@app.post('/api/tasks/{user_email}', response_model=dict)
def save_tasks(user_email: str, payload: TasksPayload):
    _require_db()
    doc_ref = db.collection(COLLECTION_NAME).document(_safe_key(user_email))
    doc_ref.set({'tasks': [t.model_dump() for t in payload.tasks], 'email': user_email}, merge=True)
    return {'success': True, 'saved': len(payload.tasks), 'user': user_email}


@app.get('/api/calendar/{user_email}', response_model=List[CalendarEvent])
def get_calendar_events(user_email: str):
    _require_db()
    doc = db.collection(COLLECTION_NAME).document(_safe_key(user_email)).get()
    if not doc.exists:
        return []
    validated = []
    for item in doc.to_dict().get('calendar_events', []):
        try:
            validated.append(CalendarEvent(**item))
        except Exception:
            pass
    return validated


@app.post('/api/calendar/{user_email}', response_model=dict)
def save_calendar_events(user_email: str, payload: CalendarPayload):
    _require_db()
    doc_ref = db.collection(COLLECTION_NAME).document(_safe_key(user_email))
    doc_ref.set({'calendar_events': [e.model_dump() for e in payload.events], 'email': user_email}, merge=True)
    return {'success': True, 'saved': len(payload.events), 'user': user_email}

class PublishLinkPayload(BaseModel):
    title: str
    url: str
    admin_email: str

@app.post("/api/admin/publish-link")
def publish_link(payload: PublishLinkPayload):
    if payload.admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore not initialized")
    
    try:
        doc_ref = db.collection('public_documents').document()
        doc_data = {
            'id': doc_ref.id,
            'filename': payload.title,
            'url': payload.url,
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        doc_ref.set(doc_data)
        return {"success": True, "document": doc_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/public-documents")
def get_public_documents():
    _require_db()
    try:
        docs = db.collection('public_documents').order_by('timestamp', direction=firestore.Query.DESCENDING).stream()
        documents = [doc.to_dict() for doc in docs]
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AdminActionPayload(BaseModel):
    admin_email: str

@app.delete("/api/admin/public-document/{doc_id}")
def delete_public_document(doc_id: str, payload: AdminActionPayload):
    if payload.admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore not initialized")
    try:
        db.collection('public_documents').document(doc_id).delete()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CalendarConfigPayload(BaseModel):
    term: str
    year: str
    url: str
    admin_email: str

@app.post("/api/admin/publish-calendar")
def publish_calendar(payload: CalendarConfigPayload):
    if payload.admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore not initialized")
    try:
        doc_ref = db.collection('settings').document('active_calendar')
        doc_ref.set({
            'term': payload.term,
            'year': payload.year,
            'url': payload.url,
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/publish-calendar")
def delete_calendar(payload: AdminActionPayload):
    if payload.admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore not initialized")
    try:
        db.collection('settings').document('active_calendar').delete()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/calendar-config")
def get_calendar_config():
    if db is None:
        raise HTTPException(status_code=503, detail="Firestore not initialized")
    try:
        doc = db.collection('settings').document('active_calendar').get()
        if doc.exists:
            return doc.to_dict()
        return {
            'term': 'Winter',
            'year': '2026',
            'url': 'https://drive.google.com/file/d/MOCK_FILE_ID/preview'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ScratchpadNote(BaseModel):
    id: str
    title: str
    content: str
    updated_at: float

class ScratchpadPayload(BaseModel):
    notes: List[ScratchpadNote]


FOLDER_ID = '1-2D4R5UsoNrI_8MS_O1wuMBlFUFdLa64'


@app.get('/api/private-scratchpad/{user_email}')
def get_scratchpad(user_email: str):
    _require_db()
    doc = db.collection(COLLECTION_NAME).document(_safe_key(user_email)).get()
    if not doc.exists:
        return []
    return doc.to_dict().get('scratchpad_notes', [])


@app.post('/api/private-scratchpad/{user_email}')
def save_scratchpad(user_email: str, payload: ScratchpadPayload):
    _require_db()
    doc_ref = db.collection(COLLECTION_NAME).document(_safe_key(user_email))
    doc_ref.set({'scratchpad_notes': [n.model_dump() for n in payload.notes], 'email': user_email}, merge=True)
    return {'success': True, 'saved': len(payload.notes), 'user': user_email}


@app.post("/api/notes/upload")
async def upload_note(
    title: str = Form(...),
    subjectCode: str = Form(...),
    department: str = Form(...),
    semester: str = Form(...),
    uploadedBy: str = Form(...),
    file: UploadFile = File(...)
):
    _require_db()
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        
        # Upload to Cloudinary
        file_io = io.BytesIO(content)
        upload_result = cloudinary.uploader.upload(
            file_io, 
            resource_type="raw", 
            public_id=f"studentos_notes/{unique_filename}"
        )
        
        data_url = upload_result.get("secure_url")
        cloudinary_public_id = upload_result.get("public_id")
        
        doc_ref = db.collection('studentos_notes').document()
        note_data = {
            'id': doc_ref.id,
            'title': title,
            'subjectCode': subjectCode,
            'department': department,
            'semester': semester,
            'fileName': file.filename,
            'fileType': file.content_type,
            'fileSize': len(content),
            'dataUrl': data_url,
            'cloudinaryPublicId': cloudinary_public_id,
            'uploadedBy': uploadedBy,
            'uploadedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'status': 'pending'
        }
        doc_ref.set(note_data)
        return {"success": True, "note": note_data}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notes/visible/{dept}/{semester}")
def get_visible_notes(dept: str, semester: str, admin_email: Optional[str] = None):
    _require_db()
    try:
        notes_ref = db.collection('studentos_notes')
        is_admin = admin_email == "bt25civ049@students.vnit.ac.in"
        
        query = notes_ref.where('department', '==', dept).where('semester', '==', semester)
        if not is_admin:
            query = query.where('status', '==', 'approved')
            
        docs = query.stream()
        notes = [doc.to_dict() for doc in docs]
        notes.sort(key=lambda x: x.get('uploadedAt', ''), reverse=True)
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/notes/pending")
def get_pending_notes(admin_email: str):
    if admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    _require_db()
    try:
        docs = db.collection('studentos_notes').where('status', '==', 'pending').stream()
        notes = [doc.to_dict() for doc in docs]
        notes.sort(key=lambda x: x.get('uploadedAt', ''), reverse=True)
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/notes/approve/{note_id}")
def approve_note(note_id: str, payload: AdminActionPayload):
    if payload.admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    _require_db()
    try:
        db.collection('studentos_notes').document(note_id).update({'status': 'approved'})
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str, admin_email: str):
    if admin_email != "bt25civ049@students.vnit.ac.in":
        raise HTTPException(status_code=403, detail="Forbidden: Admins only")
    _require_db()
    try:
        doc_ref = db.collection('studentos_notes').document(note_id)
        doc = doc_ref.get()
        if doc.exists:
            note_data = doc.to_dict()
            cloudinary_id = note_data.get('cloudinaryPublicId')
            if cloudinary_id:
                try:
                    cloudinary.uploader.destroy(cloudinary_id, resource_type="raw")
                except Exception as err:
                    print(f"Error removing from Cloudinary: {err}")
            
            # Fallback for old local files during transition
            local_file = note_data.get('localFilePath')
            if local_file:
                file_path = os.path.join(UPLOAD_DIR, local_file)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as err:
                        print(f"Error removing local file: {err}")
                        
            doc_ref.delete()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/vault/upload/{user_email}")
async def upload_vault_doc(
    user_email: str,
    title: str = Form(...),
    subject: str = Form(...),
    file: UploadFile = File(...)
):
    _require_db()
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"vault_{uuid.uuid4().hex}{file_ext}"
        
        # Upload to Cloudinary
        file_io = io.BytesIO(content)
        upload_result = cloudinary.uploader.upload(
            file_io, 
            resource_type="raw", 
            public_id=f"studentos_vault/{unique_filename}"
        )
        
        data_url = upload_result.get("secure_url")
        cloudinary_public_id = upload_result.get("public_id")
        
        doc_ref = db.collection('studentos_vault_docs').document()
        doc_data = {
            'id': doc_ref.id,
            'title': title,
            'subject': subject,
            'fileName': file.filename,
            'fileType': file.content_type,
            'fileSize': len(content),
            'dataUrl': data_url,
            'cloudinaryPublicId': cloudinary_public_id,
            'userEmail': user_email,
            'uploadedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        doc_ref.set(doc_data)
        return {"success": True, "document": doc_data}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vault/{user_email}")
def get_vault_docs(user_email: str):
    _require_db()
    try:
        docs = db.collection('studentos_vault_docs').where('userEmail', '==', user_email).stream()
        results = [doc.to_dict() for doc in docs]
        results.sort(key=lambda x: x.get('uploadedAt', ''), reverse=True)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/vault/{user_email}/{doc_id}")
def delete_vault_doc(user_email: str, doc_id: str):
    _require_db()
    try:
        doc_ref = db.collection('studentos_vault_docs').document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_data = doc.to_dict()
            if doc_data.get('userEmail') != user_email:
                raise HTTPException(status_code=403, detail="Forbidden")
            cloudinary_id = doc_data.get('cloudinaryPublicId')
            if cloudinary_id:
                try:
                    cloudinary.uploader.destroy(cloudinary_id, resource_type="raw")
                except Exception as err:
                    print(f"Error removing from Cloudinary: {err}")
                    
            # Fallback for old local files during transition
            local_file = doc_data.get('localFilePath')
            if local_file:
                file_path = os.path.join(UPLOAD_DIR, local_file)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as err:
                        print(f"Error removing local file: {err}")
                        
            doc_ref.delete()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



