from app.core.staff import dto


async def profiles(conn, include_inactive=False):
    return [
        dto(r)
        for r in await conn.fetch(
            """SELECT p.*,u.first_name,u.last_name,u.is_active,
            u.first_name||' '||u.last_name AS name_ru,
            u.first_name||' '||u.last_name AS name_en
            FROM trainer_profiles p JOIN users u ON u.id=p.user_id
            WHERE u.is_active OR $1 ORDER BY p.user_id""",
            include_inactive,
        )
    ]


async def save(conn, user_id, data):
    await conn.execute(
        """INSERT INTO trainer_profiles(user_id,zones,experience_years,specialization_ru,
            specialization_en,bio_ru,bio_en,education_ru,education_en)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(user_id) DO UPDATE SET
            zones=$2,experience_years=$3,specialization_ru=$4,specialization_en=$5,
            bio_ru=$6,bio_en=$7,education_ru=$8,education_en=$9""",
        user_id,
        data.zones,
        data.experience_years,
        data.specialization_ru,
        data.specialization_en,
        data.bio_ru,
        data.bio_en,
        data.education_ru,
        data.education_en,
    )
