import type DatabaseType from "better-sqlite3";
import { hashPassword } from "./password";
import { addDays, addMinutes, dayKey, pad, toLocalStamp } from "./dates";
import { DEFAULT_SETTINGS } from "./settings-defaults";

/** Small deterministic PRNG so demo data is stable between rebuilds. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SERVICES = [
  {
    name: "Exterior Wash",
    slug: "exterior-wash",
    description: "Foam bath, wheels, tyres and a hand dry. The weekly refresh that keeps paint safe.",
    base_price: 595,
    duration_min: 60,
    category: "wash",
    checklist: ["Pre-rinse", "Wheels clean", "Foam wash", "Contact wash", "Rinse", "Hand dry", "Tyre dressing", "Glass polish"],
  },
  {
    name: "Interior Cleaning",
    slug: "interior-cleaning",
    description: "Vacuum, steam and protect every surface inside the cabin.",
    base_price: 995,
    duration_min: 120,
    category: "interior",
    checklist: ["Remove trash", "Full vacuum", "Mats deep clean", "Steam clean plastics", "Leather clean & feed", "Glass inside", "Air freshener"],
  },
  {
    name: "Full Detail",
    slug: "full-detail",
    description: "Inside and out, top to bottom. Decontamination, gloss enhancement and a protected interior.",
    base_price: 2495,
    duration_min: 210,
    category: "detailing",
    checklist: ["Pre-rinse", "Wheels clean", "Foam wash", "Iron & tar removal", "Clay bar", "Hand dry", "Gloss enhancement", "Sealant applied", "Interior vacuum", "Interior steam clean", "Glass in & out", "Final inspection"],
  },
  {
    name: "Polishing",
    slug: "polishing",
    description: "One-step machine polish that lifts swirls and brings back depth.",
    base_price: 2995,
    duration_min: 300,
    category: "paint",
    checklist: ["Decontamination wash", "Clay bar", "Tape up trim", "Machine polish", "IPA wipe down", "Sealant applied", "Final inspection"],
  },
  {
    name: "Paint Correction",
    slug: "paint-correction",
    description: "Multi-stage correction removing up to 90% of defects. Measured, taped and finished by hand.",
    base_price: 4495,
    duration_min: 480,
    category: "paint",
    checklist: ["Paint depth readings", "Decontamination wash", "Clay bar", "Compounding stage", "Refining stage", "IPA wipe down", "Sealant applied", "Inspection under light"],
  },
  {
    name: "Ceramic Coating",
    slug: "ceramic-coating",
    description: "Correction plus a 5-year ceramic layer. Hydrophobic, hard and easy to maintain.",
    base_price: 6995,
    duration_min: 600,
    category: "protection",
    checklist: ["Paint depth readings", "Decontamination wash", "Clay bar", "Machine correction", "Panel wipe", "Coating application", "Levelling", "IR cure", "48h care briefing"],
  },
];

const PRODUCTS = [
  { name: "pH Neutral Snow Foam 5L", sku: "CHM-001", category: "chemical", price: 349, cost: 180, stock: 14, reorder_at: 4, unit: "btl" },
  { name: "Iron & Fallout Remover 5L", sku: "CHM-002", category: "chemical", price: 429, cost: 210, stock: 8, reorder_at: 3, unit: "btl" },
  { name: "Ceramic Coating 50ml", sku: "PRT-010", category: "protection", price: 1290, cost: 640, stock: 6, reorder_at: 2, unit: "kit" },
  { name: "Paint Sealant 500ml", sku: "PRT-011", category: "protection", price: 549, cost: 260, stock: 11, reorder_at: 3, unit: "btl" },
  { name: "Microfiber Drying Towel", sku: "ACC-020", category: "accessory", price: 249, cost: 95, stock: 26, reorder_at: 8, unit: "pcs" },
  { name: "Cutting Compound 1L", sku: "CHM-003", category: "chemical", price: 469, cost: 230, stock: 5, reorder_at: 3, unit: "btl" },
  { name: "Leather Cleaner & Balm", sku: "INT-030", category: "interior", price: 389, cost: 175, stock: 9, reorder_at: 3, unit: "set" },
  { name: "Air Freshener - Nordic Pine", sku: "INT-031", category: "interior", price: 89, cost: 24, stock: 42, reorder_at: 10, unit: "pcs" },
  { name: "Glass Sealant 100ml", sku: "PRT-012", category: "protection", price: 329, cost: 150, stock: 2, reorder_at: 4, unit: "btl" },
  { name: "Tyre Dressing 1L", sku: "CHM-004", category: "chemical", price: 269, cost: 120, stock: 13, reorder_at: 4, unit: "btl" },
];

const CUSTOMERS: Array<[string, string, string, string, string, string]> = [
  ["Erik Lindqvist", "erik.lindqvist@mail.se", "070-812 44 91", "Kungsgatan 12", "111 43", "Stockholm"],
  ["Sofia Bergström", "sofia.b@mail.se", "073-556 20 18", "Vasagatan 7", "111 20", "Stockholm"],
  ["Marcus Nilsson", "marcus.nilsson@mail.se", "076-330 71 05", "Sveavägen 88", "113 50", "Stockholm"],
  ["Elin Karlsson", "elin.karlsson@mail.se", "070-441 09 62", "Birger Jarlsgatan 22", "114 34", "Stockholm"],
  ["Johan Ek", "johan.ek@mail.se", "072-118 55 30", "Odengatan 4", "113 51", "Stockholm"],
  ["Anna Persson", "anna.persson@mail.se", "070-905 33 77", "Ringvägen 141", "116 61", "Stockholm"],
  ["Nordic Leasing AB", "fleet@nordicleasing.se", "08-556 12 00", "Frösundaleden 2", "169 70", "Solna"],
  ["Petter Sandberg", "petter.s@mail.se", "073-772 61 24", "Storgatan 18", "183 30", "Täby"],
  ["Linnea Holm", "linnea.holm@mail.se", "076-220 84 13", "Hantverkargatan 55", "112 31", "Stockholm"],
  ["David Åkesson", "david.akesson@mail.se", "070-654 12 89", "Solnavägen 31", "113 63", "Solna"],
  ["Camilla Wik", "camilla.wik@mail.se", "072-441 90 06", "Drottninggatan 71", "111 36", "Stockholm"],
  ["Oskar Lund", "oskar.lund@mail.se", "070-337 45 52", "Bergsgatan 9", "112 23", "Stockholm"],
];

const VEHICLES: Array<[number, string, string, number, string, string, string, number]> = [
  [1, "BMW", "530d", 2019, "ABC123", "Black", "large", 124000],
  [1, "Volvo", "V60", 2021, "JKL908", "Grey", "large", 41000],
  [2, "Audi", "A6", 2020, "XYZ789", "Silver", "large", 76500],
  [3, "Tesla", "Model Y", 2023, "DEF456", "White", "large", 18400],
  [4, "Volvo", "XC90", 2018, "GHI789", "Blue", "xl", 156000],
  [5, "Mercedes", "E200", 2022, "MNO321", "Black", "large", 33200],
  [6, "VW", "Golf R", 2021, "PQR654", "Blue", "medium", 52800],
  [7, "BMW", "X5", 2022, "STU147", "Black", "xl", 61000],
  [7, "Audi", "Q7", 2021, "STU148", "Grey", "xl", 88000],
  [8, "Porsche", "911", 2020, "VWX258", "Red", "small", 27600],
  [9, "Toyota", "RAV4", 2019, "YZA369", "White", "large", 98700],
  [10, "Volvo", "V90", 2020, "BCD741", "Grey", "large", 112000],
  [11, "Mini", "Cooper S", 2022, "EFG852", "Green", "small", 24500],
  [12, "Kia", "EV6", 2023, "HIJ963", "White", "large", 15900],
];

export function seed(db: DatabaseType.Database) {
  const now = new Date();
  const rand = rng(20240520);

  const insertUser = db.prepare(
    `INSERT INTO users (name, email, phone, role, password_hash, color, hourly_rate, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const owner = insertUser.run("Alex Björkman", "alex@detailflow.se", "070-123 45 67", "owner", hashPassword("demo1234"), "#3B82F6", 650).lastInsertRowid as number;
  const johan = insertUser.run("Johan Svensson", "johan@detailflow.se", "070-998 12 33", "technician", hashPassword("demo1234"), "#22C55E", 480).lastInsertRowid as number;
  const emil = insertUser.run("Emil Norberg", "emil@detailflow.se", "073-224 88 41", "technician", hashPassword("demo1234"), "#A855F7", 460).lastInsertRowid as number;
  const staff = [owner, johan, emil];

  const insertService = db.prepare(
    `INSERT INTO services (name, slug, description, base_price, duration_min, category, image, checklist, active, sort_order)
     VALUES (@name, @slug, @description, @base_price, @duration_min, @category, '', @checklist, 1, @sort_order)`,
  );
  SERVICES.forEach((s, i) =>
    insertService.run({ ...s, checklist: JSON.stringify(s.checklist), sort_order: i }),
  );

  const insertProduct = db.prepare(
    `INSERT INTO products (name, sku, category, price, cost, stock, reorder_at, unit, active)
     VALUES (@name, @sku, @category, @price, @cost, @stock, @reorder_at, @unit, 1)`,
  );
  PRODUCTS.forEach((p) => insertProduct.run(p));

  const insertCustomer = db.prepare(
    `INSERT INTO customers (name, email, phone, address, postal_code, city, company, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)`,
  );
  CUSTOMERS.forEach(([name, email, phone, address, postal, city], i) => {
    const created = addDays(now, -(140 - i * 11) + Math.floor(rand() * 5));
    insertCustomer.run(name, email, phone, address, postal, city, name.includes("AB") ? name : "", toLocalStamp(created));
  });

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (customer_id, make, model, year, plate, color, size, mileage, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')`,
  );
  VEHICLES.forEach((v) => insertVehicle.run(...v));

  const services = db.prepare("SELECT * FROM services ORDER BY id").all() as Array<{
    id: number; name: string; base_price: number; duration_min: number; checklist: string;
  }>;

  const insertJob = db.prepare(
    `INSERT INTO jobs (job_number, customer_id, vehicle_id, assigned_to, status, scheduled_at, duration_min,
                       location_type, address, city, condition, price, notes, source, started_at, completed_at, created_at)
     VALUES (@job_number, @customer_id, @vehicle_id, @assigned_to, @status, @scheduled_at, @duration_min,
             @location_type, @address, @city, @condition, @price, @notes, @source, @started_at, @completed_at, @created_at)`,
  );
  const insertJobService = db.prepare(
    "INSERT INTO job_services (job_id, service_id, name, price, duration_min) VALUES (?, ?, ?, ?, ?)",
  );
  const insertCheck = db.prepare(
    "INSERT INTO job_checklist (job_id, label, done, sort_order) VALUES (?, ?, ?, ?)",
  );
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (invoice_number, customer_id, job_id, status, issued_at, due_at, vat_rate, paid_at, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, 25, ?, ?, '')`,
  );
  const insertInvoiceItem = db.prepare(
    "INSERT INTO invoice_items (invoice_id, name, qty, price) VALUES (?, ?, ?, ?)",
  );

  const customerVehicles = db.prepare("SELECT id, customer_id FROM vehicles").all() as Array<{ id: number; customer_id: number }>;
  const customers = db.prepare("SELECT id, address, city FROM customers").all() as Array<{ id: number; address: string; city: string }>;

  const year = now.getFullYear();
  let jobSeq = 1000;
  let invoiceSeq = 500;

  function createJob(offsetDays: number, hour: number, status: string, serviceIdx: number, techIdx: number) {
    const veh = customerVehicles[Math.floor(rand() * customerVehicles.length)];
    const cust = customers.find((c) => c.id === veh.customer_id)!;
    const svc = services[serviceIdx];
    const scheduled = new Date(now);
    scheduled.setDate(scheduled.getDate() + offsetDays);
    scheduled.setHours(hour, offsetDays % 2 === 0 ? 0 : 30, 0, 0);
    const onsite = rand() > 0.55;
    const condition = rand() > 0.75 ? "dirty" : "normal";
    const price = Math.round(svc.base_price * (condition === "dirty" ? 1.15 : 1));
    jobSeq += 1;
    const jobNumber = `DF-${year}-${jobSeq}`;
    const startedAt = status === "in_progress" || status === "completed" ? toLocalStamp(scheduled) : null;
    const completedAt = status === "completed" ? toLocalStamp(addMinutes(scheduled, svc.duration_min)) : null;

    const jobId = insertJob.run({
      job_number: jobNumber,
      customer_id: cust.id,
      vehicle_id: veh.id,
      assigned_to: staff[techIdx % staff.length],
      status,
      scheduled_at: toLocalStamp(scheduled),
      duration_min: svc.duration_min,
      location_type: onsite ? "onsite" : "shop",
      address: onsite ? cust.address : "",
      city: onsite ? cust.city : "",
      condition,
      price,
      notes: "",
      source: rand() > 0.5 ? "online" : "admin",
      started_at: startedAt,
      completed_at: completedAt,
      created_at: toLocalStamp(addDays(scheduled, -Math.ceil(rand() * 9) - 1)),
    }).lastInsertRowid as number;

    insertJobService.run(jobId, svc.id, svc.name, price, svc.duration_min);

    const items = JSON.parse(svc.checklist) as string[];
    items.forEach((label, i) => {
      const done = status === "completed" ? 1 : status === "in_progress" && i < Math.floor(items.length / 3) ? 1 : 0;
      insertCheck.run(jobId, label, done, i);
    });

    if (status === "completed") {
      invoiceSeq += 1;
      const issued = completedAt!.slice(0, 10);
      const due = dayKey(addDays(new Date(issued), 14));
      const paid = offsetDays < -6 || rand() > 0.4;
      const invId = insertInvoice.run(
        `${year}-${invoiceSeq}`,
        cust.id,
        jobId,
        paid ? "paid" : offsetDays < -16 ? "overdue" : "sent",
        issued,
        due,
        paid ? issued : null,
        paid ? (rand() > 0.5 ? "Swish" : "Card") : "",
      ).lastInsertRowid as number;
      insertInvoiceItem.run(invId, svc.name, 1, price);
      if (rand() > 0.7) insertInvoiceItem.run(invId, "Air Freshener - Nordic Pine", 1, 89);
    }
    return jobId;
  }

  // Past 10 weeks of completed work, a few per day, weekdays weighted.
  for (let d = 70; d >= 1; d--) {
    const date = addDays(now, -d);
    const weekday = date.getDay();
    if (weekday === 0) continue;
    const count = weekday === 6 ? 1 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      createJob(-d, 8 + i * 3, "completed", Math.floor(rand() * services.length), Math.floor(rand() * 3));
    }
  }

  // Today — mirrors the dashboard schedule in the design.
  const todaySpec: Array<[number, number, string, number, number]> = [
    [8, 0, "confirmed", 2, 1],
    [10, 30, "in_progress", 1, 0],
    [13, 0, "booked", 5, 1],
    [15, 30, "booked", 0, 2],
  ];
  todaySpec.forEach(([hour, minute, status, svcIdx, techIdx]) => {
    const id = createJob(0, hour, status, svcIdx, techIdx);
    const stamp = `${dayKey(now)}T${pad(hour)}:${pad(minute)}`;
    db.prepare("UPDATE jobs SET scheduled_at = ? WHERE id = ?").run(stamp, id);
  });
  // Two more completed earlier today so the dashboard shows revenue.
  createJob(0, 7, "completed", 2, 1);
  createJob(0, 6, "completed", 1, 2);

  // Upcoming three weeks.
  for (let d = 1; d <= 21; d++) {
    const date = addDays(now, d);
    if (date.getDay() === 0) continue;
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      createJob(d, 8 + i * 3, rand() > 0.5 ? "confirmed" : "booked", Math.floor(rand() * services.length), Math.floor(rand() * 3));
    }
  }

  // Quotes
  const insertQuote = db.prepare(
    `INSERT INTO quotes (quote_number, customer_id, vehicle_id, status, valid_until, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertQuoteItem = db.prepare("INSERT INTO quote_items (quote_id, name, qty, price) VALUES (?, ?, ?, ?)");
  const quoteSpecs: Array<[number, string, string[]]> = [
    [7, "sent", ["Ceramic Coating", "Paint Correction"]],
    [3, "accepted", ["Full Detail"]],
    [10, "draft", ["Polishing", "Interior Cleaning"]],
    [5, "declined", ["Ceramic Coating"]],
    [1, "sent", ["Full Detail", "Interior Cleaning"]],
  ];
  quoteSpecs.forEach(([custId, status, items], i) => {
    const veh = customerVehicles.find((v) => v.customer_id === custId);
    const qid = insertQuote.run(
      `Q-${year}-${100 + i}`,
      custId,
      veh?.id ?? null,
      status,
      dayKey(addDays(now, 30 - i * 3)),
      "",
      toLocalStamp(addDays(now, -(2 + i * 4))),
    ).lastInsertRowid as number;
    items.forEach((name) => {
      const svc = services.find((s) => s.name === name)!;
      insertQuoteItem.run(qid, svc.name, 1, svc.base_price);
    });
  });

  const insertSetting = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
    insertSetting.run(key, JSON.stringify(value));
  });
}
