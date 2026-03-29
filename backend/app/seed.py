import asyncio
import random
from decimal import Decimal
from faker import Faker
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine, Base, AsyncSessionLocal
from app.models import User, Product, Order

fake = Faker()

CATEGORIES = [
    "Electronics",
    "Clothing",
    "Books",
    "Home & Garden",
    "Sports",
    "Toys",
    "Beauty",
    "Automotive",
    "Food",
    "Office",
]
STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"]
STATUS_WEIGHTS = [0.15, 0.15, 0.20, 0.40, 0.10]

NUM_USERS = 1000
NUM_PRODUCTS = 500
NUM_ORDERS = 100_000
BATCH_SIZE = 2000


async def already_seeded(session: AsyncSession) -> bool:
    result = await session.execute(text("SELECT COUNT(*) FROM orders"))
    count = result.scalar()
    return count >= NUM_ORDERS


async def seed_users(session: AsyncSession) -> list[int]:
    print(f"Seeding {NUM_USERS} users...")
    users = [
        {
            "name": fake.name(),
            "email": fake.unique.email(),
            "country": fake.country(),
        }
        for _ in range(NUM_USERS)
    ]
    await session.execute(
        text(
            "INSERT INTO users (name, email, country) VALUES (:name, :email, :country)"
        ),
        users,
    )
    await session.flush()
    result = await session.execute(text("SELECT id FROM users"))
    return [row[0] for row in result.fetchall()]


async def seed_products(session: AsyncSession) -> list[tuple]:
    print(f"Seeding {NUM_PRODUCTS} products...")
    products = [
        {
            "name": fake.catch_phrase(),
            "category": random.choice(CATEGORIES),
            "price": round(random.uniform(5.0, 1500.0), 2),
            "stock": random.randint(0, 500),
        }
        for _ in range(NUM_PRODUCTS)
    ]
    await session.execute(
        text(
            "INSERT INTO products (name, category, price, stock) VALUES (:name, :category, :price, :stock)"
        ),
        products,
    )
    await session.flush()
    result = await session.execute(text("SELECT id, price FROM products"))
    return result.fetchall()


async def seed_orders(
    session: AsyncSession, user_ids: list[int], product_rows: list[tuple]
):
    print(f"Seeding {NUM_ORDERS} orders in batches of {BATCH_SIZE}...")
    product_map = {row[0]: float(row[1]) for row in product_rows}
    product_ids = list(product_map.keys())

    total_batches = NUM_ORDERS // BATCH_SIZE
    for batch_num in range(total_batches):
        orders = []
        for _ in range(BATCH_SIZE):
            product_id = random.choice(product_ids)
            quantity = random.randint(1, 10)
            price = product_map[product_id]
            total = round(price * quantity, 2)
            status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
            orders.append(
                {
                    "user_id": random.choice(user_ids),
                    "product_id": product_id,
                    "status": status,
                    "quantity": quantity,
                    "total_amount": total,
                    "created_at": fake.date_time_between(
                        start_date="-2y", end_date="now"
                    ),
                }
            )

        await session.execute(
            text(
                """
                INSERT INTO orders (user_id, product_id, status, quantity, total_amount, created_at)
                VALUES (:user_id, :product_id, :status, :quantity, :total_amount, :created_at)
            """
            ),
            orders,
        )

        if (batch_num + 1) % 10 == 0:
            print(
                f"  {(batch_num + 1) * BATCH_SIZE:,} / {NUM_ORDERS:,} orders inserted..."
            )

    await session.flush()
    print("Orders seeded")


async def main():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        if await already_seeded(session):
            print("Database already seeded, Skipping")
            return

        try:
            user_ids = await seed_users(session)
            product_rows = await seed_products(session)
            await seed_orders(session, user_ids, product_rows)
            await session.commit()
            print("Seeding complete.")
        except Exception as e:
            await session.rollback()
            print(f"Seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
