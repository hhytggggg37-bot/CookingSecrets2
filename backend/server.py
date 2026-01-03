from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
import os
import logging
from pathlib import Path
import uuid
import openai
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 720))

# OpenAI Configuration (graceful handling if not set)
openai_api_key = os.environ.get('OPENAI_API_KEY', '')
if openai_api_key:
    openai.api_key = openai_api_key
    openai_configured = True
else:
    openai_configured = False
    logging.warning("⚠️  OPENAI_API_KEY not configured - AI recipe generation will be disabled")

# Stripe Configuration (graceful handling if not set)
stripe_secret = os.environ.get('STRIPE_SECRET_KEY', '')
stripe_publishable = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
if stripe_secret:
    stripe.api_key = stripe_secret
    stripe_configured = True
else:
    stripe_configured = False
    logging.warning("⚠️  STRIPE keys not configured - Payment features will be disabled")

# MongoDB connection
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create FastAPI app
app = FastAPI(title="CookingSecrets API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

# User Models
class UserRole:
    GUEST = "guest"
    USER = "user"
    CHEF = "chef"
    MODERATOR = "moderator"
    ADMIN = "admin"

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.USER  # user or chef

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class StaffLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    wallet_balance: float
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    banned: bool = False
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Recipe Models
class RecipeGenerate(BaseModel):
    ingredients: List[str]
    session_id: Optional[str] = None  # For guest users

class RecipeCreate(BaseModel):
    title: str
    ingredients: List[str]
    steps: List[str]
    image: Optional[str] = None  # base64
    is_paid: bool = False
    price: float = 0.0
    category: Optional[str] = None

class RecipeResponse(BaseModel):
    id: str
    title: str
    ingredients: List[str]
    steps: List[str]
    image: Optional[str] = None
    creator_id: str
    creator_name: str
    creator_role: str
    is_paid: bool
    price: float
    likes_count: int
    comments_count: int
    is_liked: bool = False
    is_saved: bool = False
    created_at: datetime

# Comment Models
class CommentCreate(BaseModel):
    recipe_id: str
    content: str

class CommentResponse(BaseModel):
    id: str
    recipe_id: str
    user_id: str
    user_name: str
    content: str
    reported: bool
    created_at: datetime

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    content: str
    read: bool
    created_at: datetime
    related_id: Optional[str] = None

# Transaction Models
class TransactionCreate(BaseModel):
    amount: float
    type: str  # "deposit", "purchase"
    recipe_id: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    type: str
    recipe_id: Optional[str] = None
    created_at: datetime

# Pantry Models
class PantryItemCreate(BaseModel):
    name: Optional[str] = None
    image: Optional[str] = None  # base64
    quantity_type: str  # "kg", "number", "none"
    quantity: float = 0

class PantryItemUpdate(BaseModel):
    quantity: float

class PantryItemResponse(BaseModel):
    id: str
    user_id: str
    name: Optional[str]
    image: Optional[str]
    quantity_type: str
    quantity: float
    created_at: datetime

# Report Models
class ReportCreate(BaseModel):
    comment_id: str
    reason: str

class ReportResponse(BaseModel):
    id: str
    comment_id: str
    reporter_id: str
    reporter_name: str
    comment_content: str
    reason: str
    status: str  # pending, ignored, escalated
    created_at: datetime
    reviewed_by: Optional[str] = None

# Admin Models
class UserUpdateRole(BaseModel):
    user_id: str
    new_role: str

class UserBan(BaseModel):
    user_id: str
    banned: bool


class AdminCreateStaff(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # 'admin' or 'moderator'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("banned", False):
        raise HTTPException(status_code=403, detail="User is banned")
    
    return user

async def get_current_staff(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if user["role"] not in [UserRole.MODERATOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        wallet_balance=user.get("wallet_balance", 0.0),
        profile_image=user.get("profile_image"),
        bio=user.get("bio"),
        followers_count=user.get("followers_count", 0),
        following_count=user.get("following_count", 0),
        banned=user.get("banned", False),
        created_at=user["created_at"]
    )

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user_data.role not in [UserRole.USER, UserRole.CHEF]:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'user' or 'chef'")
    
    # Create user
    user = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "wallet_balance": 0.0,
        "profile_image": None,
        "bio": None,
        "followers_count": 0,
        "following_count": 0,
        "banned": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    
    # Create token
    token = create_jwt_token({"sub": str(result.inserted_id), "role": user_data.role})
    
    return TokenResponse(access_token=token, user=user_to_response(user))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("banned", False):
        raise HTTPException(status_code=403, detail="User is banned")
    
    if user["role"] in [UserRole.MODERATOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Please use staff login")
    
    token = create_jwt_token({"sub": str(user["_id"]), "role": user["role"]})
    
    return TokenResponse(access_token=token, user=user_to_response(user))

@api_router.post("/auth/staff-login", response_model=TokenResponse)
async def staff_login(credentials: StaffLogin):
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user["role"] not in [UserRole.MODERATOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    token = create_jwt_token({"sub": str(user["_id"]), "role": user["role"]})
    
    return TokenResponse(access_token=token, user=user_to_response(user))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)

# ============================================================================
# RECIPE ENDPOINTS
# ============================================================================

@api_router.post("/recipes/generate")
async def generate_recipe(
    data: RecipeGenerate, 
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    # Check OpenAI configuration
    if not openai_configured:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    # Determine if user is authenticated
    # Determine if user is authenticated
    # (Used only to decide guest limits; not otherwise used in this endpoint)
    is_guest = True
    
    if credentials:
        try:
            token = credentials.credentials
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = await db.users.find_one({"_id": ObjectId(user_id)})
                if user and not user.get("banned", False):
                    # Keeping this assignment for potential future personalization
                    # and to avoid re-querying. Not used further in this handler.
                    _current_user = user
                    is_guest = False
        except JWTError:
            pass

    # NOTE: 'current_user' is only used for auth detection. If present, generation is not treated as guest.
    
    # Guest user: check limit (1 recipe per session)
    if is_guest:
        if not data.session_id:
            raise HTTPException(status_code=400, detail="Session ID required for guest users")
        
        session = await db.guest_sessions.find_one({"session_id": data.session_id})
        if session and session.get("recipe_count", 0) >= 1:
            raise HTTPException(
                status_code=403,
                detail="Guest limit reached. Please sign up to generate unlimited recipes."
            )
    
    # Build OpenAI prompt
    ingredients_text = ", ".join(data.ingredients)
    prompt = f"""You are a professional chef. Create a delicious recipe using ONLY these ingredients: {ingredients_text}.
You may also use basic staples like salt, pepper, oil, and water.

Return ONLY a valid JSON object in this exact format:
{{
  "title": "Recipe name",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "steps": ["Step 1", "Step 2", "Step 3"]
}}

Do not include any markdown, explanations, or extra text. Only return the JSON."""

    try:
        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional chef who creates recipes in JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        recipe_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        import json
        recipe_data = json.loads(recipe_text)
        
        # Validate structure
        if "title" not in recipe_data or "ingredients" not in recipe_data or "steps" not in recipe_data:
            raise ValueError("Invalid recipe structure")
        
        # Update guest session count
        if is_guest:
            await db.guest_sessions.update_one(
                {"session_id": data.session_id},
                {
                    "$set": {"session_id": data.session_id, "updated_at": datetime.utcnow()},
                    "$inc": {"recipe_count": 1}
                },
                upsert=True
            )
        
        return {
            "success": True,
            "recipe": recipe_data,
            "requires_login": is_guest
        }
        
    except json.JSONDecodeError:
        logger.error(f"Failed to parse OpenAI response: {recipe_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"OpenAI API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.post("/recipes", response_model=RecipeResponse)
async def create_recipe(recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    # Only chef can create paid recipes
    if recipe_data.is_paid and current_user["role"] != UserRole.CHEF:
        raise HTTPException(status_code=403, detail="Only chefs can create paid recipes")
    
    recipe = {
        "title": recipe_data.title,
        "ingredients": recipe_data.ingredients,
        "steps": recipe_data.steps,
        "image": recipe_data.image,
        "creator_id": str(current_user["_id"]),
        "creator_name": current_user["name"],
        "creator_role": current_user["role"],
        "is_paid": recipe_data.is_paid,
        "price": recipe_data.price if recipe_data.is_paid else 0.0,
        "category": recipe_data.category,
        "likes_count": 0,
        "comments_count": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await db.recipes.insert_one(recipe)
    recipe["_id"] = result.inserted_id
    
    return RecipeResponse(
        id=str(recipe["_id"]),
        **{k: v for k, v in recipe.items() if k != "_id"},
        is_liked=False,
        is_saved=False
    )

@api_router.get("/recipes", response_model=List[RecipeResponse])
async def get_recipes(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    creator_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    if creator_id:
        query["creator_id"] = creator_id
    
    # Search functionality
    if search:
        search_lower = search.lower()
        # MongoDB text search or regex
        query["$or"] = [
            {"title": {"$regex": search_lower, "$options": "i"}},
            {"creator_name": {"$regex": search_lower, "$options": "i"}},
            {"ingredients": {"$elemMatch": {"$regex": search_lower, "$options": "i"}}},
        ]
    
    recipes = await db.recipes.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get user's likes and saved recipes
    likes = await db.likes.find({"user_id": str(current_user["_id"])}).to_list(1000)
    liked_recipe_ids = {like["recipe_id"] for like in likes}
    
    saved = await db.cookbook.find({"user_id": str(current_user["_id"])}).to_list(1000)
    saved_recipe_ids = {s["recipe_id"] for s in saved}
    
    result = []
    for recipe in recipes:
        recipe_id = str(recipe["_id"])
        result.append(RecipeResponse(
            id=recipe_id,
            **{k: v for k, v in recipe.items() if k != "_id"},
            is_liked=recipe_id in liked_recipe_ids,
            is_saved=recipe_id in saved_recipe_ids
        ))
    
    return result

@api_router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")
    
    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Check if user has purchased (if paid)
    if recipe["is_paid"]:
        purchase = await db.transactions.find_one({
            "user_id": str(current_user["_id"]),
            "recipe_id": recipe_id,
            "type": "purchase"
        })
        if not purchase and str(recipe["creator_id"]) != str(current_user["_id"]):
            raise HTTPException(status_code=402, detail="Recipe must be purchased")
    
    # Check if liked/saved
    is_liked = await db.likes.find_one({"user_id": str(current_user["_id"]), "recipe_id": recipe_id}) is not None
    is_saved = await db.cookbook.find_one({"user_id": str(current_user["_id"]), "recipe_id": recipe_id}) is not None
    
    return RecipeResponse(
        id=str(recipe["_id"]),
        **{k: v for k, v in recipe.items() if k != "_id"},
        is_liked=is_liked,
        is_saved=is_saved
    )

# ============================================================================
# SOCIAL ENDPOINTS
# ============================================================================

@api_router.post("/recipes/{recipe_id}/like")
async def toggle_like(recipe_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")
    
    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    user_id = str(current_user["_id"])
    like = await db.likes.find_one({"user_id": user_id, "recipe_id": recipe_id})
    
    if like:
        # Unlike
        await db.likes.delete_one({"_id": like["_id"]})
        await db.recipes.update_one({"_id": ObjectId(recipe_id)}, {"$inc": {"likes_count": -1}})
        return {"liked": False, "likes_count": recipe["likes_count"] - 1}
    else:
        # Like
        await db.likes.insert_one({
            "user_id": user_id,
            "recipe_id": recipe_id,
            "created_at": datetime.utcnow()
        })
        await db.recipes.update_one({"_id": ObjectId(recipe_id)}, {"$inc": {"likes_count": 1}})
        
        # Create notification for recipe creator
        if str(recipe["creator_id"]) != user_id:
            await db.notifications.insert_one({
                "user_id": str(recipe["creator_id"]),
                "type": "like",
                "content": f"{current_user['name']} liked your recipe '{recipe['title']}'",
                "read": False,
                "related_id": recipe_id,
                "created_at": datetime.utcnow()
            })
        
        return {"liked": True, "likes_count": recipe["likes_count"] + 1}

@api_router.post("/recipes/{recipe_id}/comments", response_model=CommentResponse)
async def create_comment(recipe_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")
    
    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    comment = {
        "recipe_id": recipe_id,
        "user_id": str(current_user["_id"]),
        "user_name": current_user["name"],
        "content": comment_data.content,
        "reported": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.comments.insert_one(comment)
    await db.recipes.update_one({"_id": ObjectId(recipe_id)}, {"$inc": {"comments_count": 1}})
    
    # Create notification
    if str(recipe["creator_id"]) != str(current_user["_id"]):
        await db.notifications.insert_one({
            "user_id": str(recipe["creator_id"]),
            "type": "comment",
            "content": f"{current_user['name']} commented on your recipe '{recipe['title']}'",
            "read": False,
            "related_id": recipe_id,
            "created_at": datetime.utcnow()
        })
    
    comment["_id"] = result.inserted_id
    return CommentResponse(id=str(comment["_id"]), **{k: v for k, v in comment.items() if k != "_id"})

@api_router.get("/recipes/{recipe_id}/comments", response_model=List[CommentResponse])
async def get_comments(recipe_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"recipe_id": recipe_id}).sort("created_at", -1).to_list(100)
    return [CommentResponse(id=str(c["_id"]), **{k: v for k, v in c.items() if k != "_id"}) for c in comments]

# ============================================================================
# COOKBOOK ENDPOINTS
# ============================================================================

@api_router.post("/cookbook/{recipe_id}")
async def save_to_cookbook(recipe_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")
    
    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    user_id = str(current_user["_id"])
    existing = await db.cookbook.find_one({"user_id": user_id, "recipe_id": recipe_id})
    
    if existing:
        # Remove from cookbook
        await db.cookbook.delete_one({"_id": existing["_id"]})
        return {"saved": False}
    else:
        # Add to cookbook (login required for guests)
        if current_user["role"] == UserRole.GUEST:
            raise HTTPException(status_code=401, detail="Login required to save recipes")
        
        await db.cookbook.insert_one({
            "user_id": user_id,
            "recipe_id": recipe_id,
            "saved_at": datetime.utcnow()
        })
        return {"saved": True}

@api_router.get("/cookbook", response_model=List[RecipeResponse])
async def get_cookbook(current_user: dict = Depends(get_current_user)):
    saved = await db.cookbook.find({"user_id": str(current_user["_id"])}).sort("saved_at", -1).to_list(100)
    recipe_ids = [ObjectId(s["recipe_id"]) for s in saved if ObjectId.is_valid(s["recipe_id"])]
    
    recipes = await db.recipes.find({"_id": {"$in": recipe_ids}}).to_list(100)
    
    # Get user's likes
    likes = await db.likes.find({"user_id": str(current_user["_id"])}).to_list(1000)
    liked_recipe_ids = {like["recipe_id"] for like in likes}
    
    result = []
    for recipe in recipes:
        recipe_id = str(recipe["_id"])
        result.append(RecipeResponse(
            id=recipe_id,
            **{k: v for k, v in recipe.items() if k != "_id"},
            is_liked=recipe_id in liked_recipe_ids,
            is_saved=True
        ))
    
    return result

# ============================================================================
# WALLET & PAYMENT ENDPOINTS
# ============================================================================

@api_router.get("/wallet/balance")
async def get_wallet_balance(current_user: dict = Depends(get_current_user)):
    return {"balance": current_user.get("wallet_balance", 0.0)}

@api_router.post("/wallet/deposit")
async def deposit_to_wallet(data: dict, current_user: dict = Depends(get_current_user)):
    """Deposit into wallet.

    NOTE: Frontend uses a FAKE Razorpay UI in test mode.
    This endpoint simply credits the user's wallet and records a transaction.
    """

    amount = float(data.get("amount", 0) or 0)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Update wallet
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"wallet_balance": amount}}
    )

    # Record transaction
    await db.transactions.insert_one({
        "user_id": str(current_user["_id"]),
        "amount": amount,
        "type": "deposit",
        "created_at": datetime.utcnow()
    })

    return {"success": True, "new_balance": current_user.get("wallet_balance", 0.0) + amount}

@api_router.post("/wallet/purchase/{recipe_id}")
async def purchase_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")
    
    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if not recipe["is_paid"]:
        raise HTTPException(status_code=400, detail="Recipe is free")
    
    # Check if already purchased
    existing = await db.transactions.find_one({
        "user_id": str(current_user["_id"]),
        "recipe_id": recipe_id,
        "type": "purchase"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Recipe already purchased")
    
    # Check wallet balance
    if current_user.get("wallet_balance", 0.0) < recipe["price"]:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance")
    
    # Deduct from buyer
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"wallet_balance": -recipe["price"]}}
    )
    
    # Add to chef
    await db.users.update_one(
        {"_id": ObjectId(recipe["creator_id"])},
        {"$inc": {"wallet_balance": recipe["price"]}}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "user_id": str(current_user["_id"]),
        "amount": recipe["price"],
        "type": "purchase",
        "recipe_id": recipe_id,
        "created_at": datetime.utcnow()
    })
    
    # Create notification for chef
    await db.notifications.insert_one({
        "user_id": str(recipe["creator_id"]),
        "type": "purchase",
        "content": f"{current_user['name']} purchased your recipe '{recipe['title']}'",
        "read": False,
        "related_id": recipe_id,
        "created_at": datetime.utcnow()
    })
    
    return {"success": True, "message": "Recipe purchased successfully"}

@api_router.get("/wallet/transactions", response_model=List[TransactionResponse])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(100)
    return [TransactionResponse(id=str(t["_id"]), **{k: v for k, v in t.items() if k != "_id"}) for t in transactions]

# ============================================================================
# NOTIFICATION ENDPOINTS
# ============================================================================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(50)
    return [NotificationResponse(id=str(n["_id"]), **{k: v for k, v in n.items() if k != "_id"}) for n in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])},
        {"$set": {"read": True}}
    )
    return {"success": True}

# ============================================================================
# MODERATION ENDPOINTS
# ============================================================================

@api_router.post("/moderation/report", response_model=ReportResponse)
async def report_comment(report_data: ReportCreate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(report_data.comment_id):
        raise HTTPException(status_code=400, detail="Invalid comment ID")
    
    comment = await db.comments.find_one({"_id": ObjectId(report_data.comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Mark comment as reported
    await db.comments.update_one({"_id": ObjectId(report_data.comment_id)}, {"$set": {"reported": True}})
    
    report = {
        "comment_id": report_data.comment_id,
        "reporter_id": str(current_user["_id"]),
        "reporter_name": current_user["name"],
        "comment_content": comment["content"],
        "reason": report_data.reason,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "reviewed_by": None
    }
    
    result = await db.reports.insert_one(report)
    report["_id"] = result.inserted_id
    
    return ReportResponse(id=str(report["_id"]), **{k: v for k, v in report.items() if k != "_id"})

@api_router.get("/moderation/reports", response_model=List[ReportResponse])
async def get_reports(current_user: dict = Depends(get_current_staff)):
    reports = await db.reports.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    return [ReportResponse(id=str(r["_id"]), **{k: v for k, v in r.items() if k != "_id"}) for r in reports]

@api_router.post("/moderation/reports/{report_id}/ignore")
async def ignore_report(report_id: str, current_user: dict = Depends(get_current_staff)):
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": "ignored", "reviewed_by": str(current_user["_id"])}}
    )
    return {"success": True}

@api_router.post("/moderation/reports/{report_id}/escalate")
async def escalate_report(report_id: str, current_user: dict = Depends(get_current_staff)):
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": "escalated", "reviewed_by": str(current_user["_id"])}}
    )
    
    # Notify all admins
    admins = await db.users.find({"role": UserRole.ADMIN}).to_list(100)
    for admin in admins:
        await db.notifications.insert_one({
            "user_id": str(admin["_id"]),
            "type": "escalation",
            "content": f"Report escalated by {current_user['name']}",
            "read": False,
            "related_id": report_id,
            "created_at": datetime.utcnow()
        })
    
    return {"success": True}

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@api_router.post("/admin/create-moderator")
async def create_moderator(email: EmailStr, password: str, name: str, current_user: dict = Depends(get_current_admin)):
    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    moderator = {
        "email": email,
        "password": hash_password(password),
        "name": name,
        "role": UserRole.MODERATOR,
        "wallet_balance": 0.0,
        "banned": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(moderator)
    return {"success": True, "moderator_id": str(result.inserted_id)}

@api_router.post("/admin/update-role")
async def update_user_role(data: UserUpdateRole, current_user: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(data.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if data.new_role not in [UserRole.USER, UserRole.CHEF, UserRole.MODERATOR]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"_id": ObjectId(data.user_id)},
        {"$set": {"role": data.new_role}}
    )
    return {"success": True}

@api_router.post("/admin/ban-user")
async def ban_user(data: UserBan, current_user: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(data.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    await db.users.update_one(
        {"_id": ObjectId(data.user_id)},
        {"$set": {"banned": data.banned}}
    )
    return {"success": True}

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_admin)):
    users = await db.users.find({}).sort("created_at", -1).to_list(1000)
    return [user_to_response(u) for u in users]

@api_router.post("/admin/create-staff")
async def create_staff_account(data: AdminCreateStaff, current_user: dict = Depends(get_current_admin)):
    # Validate role
    if data.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'moderator'")

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    staff = {
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "wallet_balance": 0.0,
        "banned": False,
        "created_at": datetime.utcnow()
    }

    result = await db.users.insert_one(staff)
    return {"success": True, "staff_id": str(result.inserted_id)}

@api_router.post("/moderation/ban-user")
async def moderation_ban_user(data: UserBan, current_user: dict = Depends(get_current_staff)):
    # Moderators/Admins can ban/unban any non-admin users.
    if not ObjectId.is_valid(data.user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    target = await db.users.find_one({"_id": ObjectId(data.user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("role") == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot ban an admin")

    await db.users.update_one(
        {"_id": ObjectId(data.user_id)},
        {"$set": {"banned": data.banned}}
    )

    return {"success": True}

@api_router.post("/moderation/delete-recipe")
async def moderation_delete_recipe(recipe_id: str, current_user: dict = Depends(get_current_staff)):
    if not ObjectId.is_valid(recipe_id):
        raise HTTPException(status_code=400, detail="Invalid recipe ID")

    recipe = await db.recipes.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    await db.recipes.delete_one({"_id": ObjectId(recipe_id)})

    # Optional: clean related entities
    await db.comments.delete_many({"recipe_id": recipe_id})
    await db.likes.delete_many({"recipe_id": recipe_id})
    await db.cookbook.delete_many({"recipe_id": recipe_id})

    return {"success": True}

@api_router.get("/admin/reports/escalated", response_model=List[ReportResponse])
async def get_escalated_reports(current_user: dict = Depends(get_current_admin)):
    reports = await db.reports.find({"status": "escalated"}).sort("created_at", -1).to_list(100)
    return [ReportResponse(id=str(r["_id"]), **{k: v for k, v in r.items() if k != "_id"}) for r in reports]

# ============================================================================
# PANTRY ENDPOINTS
# ============================================================================

@api_router.post("/pantry", response_model=PantryItemResponse)
async def create_pantry_item(item_data: PantryItemCreate, current_user: dict = Depends(get_current_user)):
    # Validation: at least name OR image required
    if not item_data.name and not item_data.image:
        raise HTTPException(status_code=400, detail="Either name or image is required")
    
    # Validation: quantity_type must be valid
    if item_data.quantity_type not in ["kg", "number", "none"]:
        raise HTTPException(status_code=400, detail="Invalid quantity_type. Must be: kg, number, or none")
    
    # Validation: quantity must be non-negative
    if item_data.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    # Validation: number type must be integer
    if item_data.quantity_type == "number" and item_data.quantity != int(item_data.quantity):
        raise HTTPException(status_code=400, detail="Quantity for 'number' type must be an integer")
    
    item = {
        "user_id": str(current_user["_id"]),
        "name": item_data.name,
        "image": item_data.image,
        "quantity_type": item_data.quantity_type,
        "quantity": item_data.quantity if item_data.quantity_type != "none" else 0,
        "created_at": datetime.utcnow()
    }
    
    result = await db.pantry.insert_one(item)
    item["_id"] = result.inserted_id
    
    return PantryItemResponse(
        id=str(item["_id"]),
        **{k: v for k, v in item.items() if k != "_id"}
    )

@api_router.get("/pantry", response_model=List[PantryItemResponse])
async def get_pantry_items(current_user: dict = Depends(get_current_user)):
    # Get user's pantry items sorted by creation date
    items = await db.pantry.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(100)
    return [PantryItemResponse(id=str(item["_id"]), **{k: v for k, v in item.items() if k != "_id"}) for item in items]

@api_router.put("/pantry/{item_id}", response_model=PantryItemResponse)
async def update_pantry_item(item_id: str, update_data: PantryItemUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    item = await db.pantry.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Ownership check
    if str(item["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    
    # Validation: quantity must be non-negative
    if update_data.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    
    # Validation: number type must be integer
    if item["quantity_type"] == "number" and update_data.quantity != int(update_data.quantity):
        raise HTTPException(status_code=400, detail="Quantity for 'number' type must be an integer")
    
    # For "none" type, quantity should remain 0
    if item["quantity_type"] == "none":
        raise HTTPException(status_code=400, detail="Cannot update quantity for checklist items")
    
    await db.pantry.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"quantity": update_data.quantity}}
    )
    
    item["quantity"] = update_data.quantity
    
    return PantryItemResponse(
        id=str(item["_id"]),
        **{k: v for k, v in item.items() if k != "_id"}
    )

@api_router.delete("/pantry/{item_id}")
async def delete_pantry_item(item_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    item = await db.pantry.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Ownership check
    if str(item["user_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    await db.pantry.delete_one({"_id": ObjectId(item_id)})
    
    return {"success": True, "message": "Item deleted"}

# ============================================================================
# DASHBOARD & STATS ENDPOINTS
# ============================================================================

@api_router.get("/dashboard/trending")
async def get_trending_recipes(current_user: dict = Depends(get_current_user)):
    # Get most liked recipes in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recipes = await db.recipes.find({
        "created_at": {"$gte": seven_days_ago}
    }).sort("likes_count", -1).limit(10).to_list(10)
    
    return recipes

@api_router.get("/dashboard/top-chefs")
async def get_top_chefs(current_user: dict = Depends(get_current_user)):
    # Get chefs with highest earnings
    chefs = await db.users.find({"role": UserRole.CHEF}).sort("wallet_balance", -1).limit(10).to_list(10)
    return [user_to_response(chef) for chef in chefs]

@api_router.get("/dashboard/most-liked")
async def get_most_liked_recipes(current_user: dict = Depends(get_current_user)):
    # Get top 3 recipes by like count for social proof
    recipes = await db.recipes.find({}).sort("likes_count", -1).limit(3).to_list(3)
    
    # Get user's likes
    likes = await db.likes.find({"user_id": str(current_user["_id"])}).to_list(1000)
    liked_recipe_ids = {like["recipe_id"] for like in likes}
    
    result = []
    for recipe in recipes:
        recipe_id = str(recipe["_id"])
        result.append(RecipeResponse(
            id=recipe_id,
            **{k: v for k, v in recipe.items() if k != "_id"},
            is_liked=recipe_id in liked_recipe_ids,
            is_saved=False
        ))
    
    return result

@api_router.get("/users/top-creator")
async def get_top_creator(current_user: dict = Depends(get_current_user)):
    # Get creator with highest earnings (most successful monetization)
    # This drives marketplace discovery
    top_creator = await db.users.find_one(
        {"role": {"$in": [UserRole.CHEF, UserRole.USER]}},
        sort=[("wallet_balance", -1)]
    )
    
    if not top_creator:
        return None
    
    return {
        "id": str(top_creator["_id"]),
        "name": top_creator["name"],
        "role": top_creator["role"],
        "wallet_balance": top_creator.get("wallet_balance", 0.0),
        "metric": "Most Earned"
    }

# ============================================================================
# HEALTH CHECK
# ============================================================================

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": openai_configured,
        "stripe_configured": stripe_configured,
        "database": "connected"
    }

# Include router in app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
