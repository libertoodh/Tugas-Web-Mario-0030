import "dotenv/config";
import bcrypt from "bcryptjs";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi di .env");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

type Branch = { id: string; name: string };
type Staff = { id: string; name: string; branch_id: string };
type Treatment = { id: string; name: string; base: number };

const branchSeeds = [
  { name: "Salon A", address: "Jl. Raya Seminyak No. 18, Badung" },
  { name: "Salon B", address: "Jl. Danau Tamblingan No. 42, Denpasar" },
];

const staffSeeds = [
  { name: "Ani", branch: "Salon A" },
  { name: "Sinta", branch: "Salon A" },
  { name: "Dewi", branch: "Salon A" },
  { name: "Budi", branch: "Salon B" },
  { name: "Rina", branch: "Salon B" },
  { name: "Maya", branch: "Salon B" },
];

const treatmentSeeds = [
  { name: "Haircut", description: "Potong rambut dan finishing.", base: 100000 },
  { name: "Hair Wash", description: "Cuci rambut dengan pijat kepala.", base: 75000 },
  { name: "Blow Dry", description: "Pengeringan dan penataan rambut.", base: 85000 },
  { name: "Creambath", description: "Perawatan rambut dengan krim nutrisi.", base: 150000 },
  { name: "Hair Mask", description: "Masker rambut untuk perbaikan tekstur.", base: 175000 },
  { name: "Hair Color", description: "Pewarnaan rambut.", base: 450000 },
  { name: "Smoothing", description: "Pelurusan rambut.", base: 650000 },
  { name: "Styling", description: "Penataan rambut untuk acara.", base: 125000 },
  { name: "Facial", description: "Perawatan wajah.", base: 200000 },
  { name: "Manicure", description: "Perawatan kuku tangan.", base: 90000 },
  { name: "Pedicure", description: "Perawatan kuku kaki.", base: 100000 },
  { name: "Body Massage", description: "Pijat relaksasi tubuh.", base: 250000 },
];

async function upsertBranch(name: string, address: string): Promise<Branch> {
  const found = await client.query<Branch>(
    "SELECT id, name FROM salon_branches WHERE lower(name) = lower($1)",
    [name],
  );
  if (found.rowCount) {
    await client.query("UPDATE salon_branches SET address = $2, is_active = true WHERE id = $1", [
      found.rows[0].id,
      address,
    ]);
    return found.rows[0];
  }
  const inserted = await client.query<Branch>(
    "INSERT INTO salon_branches (name, address) VALUES ($1, $2) RETURNING id, name",
    [name, address],
  );
  return inserted.rows[0];
}

async function upsertStaff(name: string, branchId: string): Promise<Staff> {
  const found = await client.query<Staff>(
    "SELECT id, name, branch_id FROM staff WHERE branch_id = $1 AND lower(name) = lower($2)",
    [branchId, name],
  );
  if (found.rowCount) {
    await client.query("UPDATE staff SET is_active = true WHERE id = $1", [found.rows[0].id]);
    return found.rows[0];
  }
  const inserted = await client.query<Staff>(
    "INSERT INTO staff (name, branch_id) VALUES ($1, $2) RETURNING id, name, branch_id",
    [name, branchId],
  );
  return inserted.rows[0];
}

async function upsertTreatment(item: (typeof treatmentSeeds)[number]): Promise<Treatment> {
  const found = await client.query<Treatment>(
    "SELECT id, name FROM treatments WHERE lower(name) = lower($1)",
    [item.name],
  );
  if (found.rowCount) {
    await client.query(
      "UPDATE treatments SET description = $2, is_active = true WHERE id = $1",
      [found.rows[0].id, item.description],
    );
    return { ...found.rows[0], base: item.base };
  }
  const inserted = await client.query<Treatment>(
    "INSERT INTO treatments (name, description) VALUES ($1, $2) RETURNING id, name",
    [item.name, item.description],
  );
  return { ...inserted.rows[0], base: item.base };
}

async function upsertProfile(input: {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "staff";
  branchId: string | null;
  staffId: string | null;
}): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const found = await client.query<{ id: string }>(
    "SELECT id FROM profiles WHERE lower(email) = lower($1)",
    [input.email],
  );
  if (found.rowCount) {
    await client.query(
      `UPDATE profiles
       SET full_name = $2, password_hash = $3, role = $4,
           branch_id = $5, staff_id = $6, is_active = true
       WHERE id = $1`,
      [
        found.rows[0].id,
        input.fullName,
        passwordHash,
        input.role,
        input.branchId,
        input.staffId,
      ],
    );
    return found.rows[0];
  }
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO profiles
       (email, password_hash, full_name, role, branch_id, staff_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.email,
      passwordHash,
      input.fullName,
      input.role,
      input.branchId,
      input.staffId,
    ],
  );
  return inserted.rows[0];
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function roundTo(value: number, step = 5000) {
  return Math.max(step, Math.round(value / step) * step);
}

await client.query("BEGIN");
try {
  const branches = new Map<string, Branch>();
  for (const item of branchSeeds) {
    const branch = await upsertBranch(item.name, item.address);
    branches.set(item.name, branch);
  }

  const staff = new Map<string, Staff>();
  for (const item of staffSeeds) {
    const branch = branches.get(item.branch);
    if (!branch) throw new Error(`Cabang ${item.branch} tidak ditemukan`);
    const row = await upsertStaff(item.name, branch.id);
    staff.set(`${item.branch}:${item.name}`, row);
  }

  const treatments: Treatment[] = [];
  for (const item of treatmentSeeds) {
    treatments.push(await upsertTreatment(item));
  }

  const salonA = branches.get("Salon A");
  const salonB = branches.get("Salon B");
  const ani = staff.get("Salon A:Ani");
  const rina = staff.get("Salon B:Rina");
  if (!salonA || !salonB || !ani || !rina) {
    throw new Error("Data master dasar tidak lengkap");
  }

  await upsertProfile({
    email: "admin@salon.local",
    password: "Admin123!",
    fullName: "Admin Utama",
    role: "admin",
    branchId: null,
    staffId: null,
  });
  const aniProfile = await upsertProfile({
    email: "ani@salon.local",
    password: "Staff123!",
    fullName: "Ani",
    role: "staff",
    branchId: salonA.id,
    staffId: ani.id,
  });
  const rinaProfile = await upsertProfile({
    email: "rina@salon.local",
    password: "Staff123!",
    fullName: "Rina",
    role: "staff",
    branchId: salonB.id,
    staffId: rina.id,
  });

  const seedDemo = process.env.SEED_DEMO !== "false";
  const existingDemo = await client.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM transactions WHERE is_demo",
  );
  let demoCount = Number(existingDemo.rows[0]?.count ?? 0);

  if (seedDemo && demoCount === 0) {
    const random = createRandom(20261030);
    const today = formatInTimeZone(new Date(), "Asia/Makassar", "yyyy-MM-dd");
    const branchData = [
      {
        branch: salonA,
        account: aniProfile,
        performers: ["Ani", "Sinta", "Dewi"].map((name) => staff.get(`Salon A:${name}`)!),
      },
      {
        branch: salonB,
        account: rinaProfile,
        performers: ["Budi", "Rina", "Maya"].map((name) => staff.get(`Salon B:${name}`)!),
      },
    ];

    let inserted = 0;
    for (let offset = 44; offset >= 0; offset -= 1) {
      const date = formatInTimeZone(subDays(new Date(`${today}T12:00:00+08:00`), offset), "Asia/Makassar", "yyyy-MM-dd");
      for (const data of branchData) {
        if (random() < 0.12) continue;
        const count = 1 + Math.floor(random() * 3);
        for (let index = 0; index < count; index += 1) {
          const treatment = treatments[Math.floor(random() * treatments.length)];
          const performer = data.performers[Math.floor(random() * data.performers.length)];
          const total = roundTo(treatment.base + Math.floor(random() * 10) * 5000);
          const mode = random();
          const payments: { method: string; amount: number }[] = [];
          if (mode < 0.58) {
            payments.push({ method: "cash", amount: total });
          } else if (mode < 0.78) {
            payments.push({ method: "qris", amount: total });
          } else if (mode < 0.9) {
            payments.push({ method: "transfer", amount: total });
          } else {
            const cash = Math.max(5000, Math.round((total * 0.4) / 5000) * 5000);
            payments.push({ method: "cash", amount: cash });
            payments.push({ method: "qris", amount: total - cash });
          }

          const hour = 9 + Math.floor(random() * 9);
          const minute = Math.floor(random() * 60);
          const createdAt = `${date} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08`;

          const tx = await client.query<{ id: string }>(
            `INSERT INTO transactions
               (branch_id, transaction_date, staff_id, treatment_id, total_amount,
                entered_by, notes, is_demo, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8::timestamptz)
             RETURNING id`,
            [
              data.branch.id,
              date,
              performer.id,
              treatment.id,
              total,
              data.account.id,
              "Data demo",
              createdAt,
            ],
          );
          for (const payment of payments) {
            await client.query(
              "INSERT INTO transaction_payments (transaction_id, payment_method, amount) VALUES ($1, $2, $3)",
              [tx.rows[0].id, payment.method, payment.amount],
            );
          }
          inserted += 1;
        }
      }
    }
    demoCount = inserted;
  }

  await client.query("COMMIT");
  console.log("Seed selesai.");
  console.log(`  Cabang        : ${branches.size}`);
  console.log(`  Staff         : ${staff.size}`);
  console.log(`  Treatment     : ${treatments.length}`);
  console.log(`  Akun          : admin@salon.local, ani@salon.local, rina@salon.local`);
  console.log(`  Transaksi demo: ${demoCount}${seedDemo ? "" : " (dimatikan)"}`);
  console.log("\nKredensial demo:");
  console.log("  Admin  : admin@salon.local / Admin123!");
  console.log("  Staff A: ani@salon.local   / Staff123!");
  console.log("  Staff B: rina@salon.local  / Staff123!");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : error);
  await client.end();
  process.exit(1);
}

await client.end();
