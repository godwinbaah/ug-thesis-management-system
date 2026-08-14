/* Seed script: demo users, theses, assignments, and finance rate.
 * Run with: npm run db:seed
 * Passwords below are examiner/demo credentials (documented in
 * Deployment_and_Source_Links.txt) — not for production use.
 */
import bcrypt from "bcryptjs";
import { db, users, theses, supervisorAssignments, settings } from "./index";

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const inserted = await db
    .insert(users)
    .values([
      { name: "Ama Owusu (Coordinator)", email: "admin@ug.edu.gh", passwordHash: hash("Admin#2026"), role: "ADMIN" },
      { name: "Kofi Finance", email: "finance@ug.edu.gh", passwordHash: hash("Finance#2026"), role: "FINANCE" },
      { name: "Prof. Solomon Mensah", email: "smensah@ug.edu.gh", passwordHash: hash("Lecturer#2026"), role: "LECTURER" },
      { name: "Dr. Efua Boateng", email: "eboateng@ug.edu.gh", passwordHash: hash("Lecturer#2026"), role: "LECTURER" },
      { name: "Dr. Yaw Asante", email: "yasante@ug.edu.gh", passwordHash: hash("Lecturer#2026"), role: "LECTURER" },
      { name: "Akosua Mensah", email: "akosua@st.ug.edu.gh", passwordHash: hash("Student#2026"), role: "STUDENT" },
      { name: "Kwame Adjei", email: "kwame@st.ug.edu.gh", passwordHash: hash("Student#2026"), role: "STUDENT" },
      { name: "Abena Sarpong", email: "abena@st.ug.edu.gh", passwordHash: hash("Student#2026"), role: "STUDENT" },
    ])
    .returning({ id: users.id, email: users.email });

  const byEmail = Object.fromEntries(inserted.map((u) => [u.email, u.id]));

  const insertedTheses = await db
    .insert(theses)
    .values([
      {
        title: "Machine Learning for Crop Yield Prediction in Northern Ghana",
        description: "MPhil thesis applying ML models to agricultural yield data.",
        academicYear: "2025/2026",
        studentId: byEmail["akosua@st.ug.edu.gh"],
      },
      {
        title: "A Mobile-Money Fraud Detection Framework",
        description: "MSc thesis on anomaly detection in mobile money transactions.",
        academicYear: "2025/2026",
        studentId: byEmail["kwame@st.ug.edu.gh"],
      },
      {
        title: "Optimising Public Transport Routing in Accra",
        description: "MSc thesis using graph algorithms on trotro route data.",
        academicYear: "2025/2026",
        studentId: byEmail["abena@st.ug.edu.gh"],
        status: "COMPLETED" as const,
        completedAt: new Date().toISOString(),
      },
    ])
    .returning({ id: theses.id });

  await db.insert(supervisorAssignments).values([
    // Thesis 1: collaborative supervision (the "Cartesian" case)
    { thesisId: insertedTheses[0].id, lecturerId: byEmail["smensah@ug.edu.gh"], role: "PRIMARY" },
    { thesisId: insertedTheses[0].id, lecturerId: byEmail["eboateng@ug.edu.gh"], role: "CO_SUPERVISOR" },
    // Thesis 2: sole supervision
    { thesisId: insertedTheses[1].id, lecturerId: byEmail["yasante@ug.edu.gh"], role: "PRIMARY" },
    // Thesis 3 (completed): co-supervised — tests the payment split.
    // One supervisor already paid, one still outstanding, to demo the paid/unpaid view.
    {
      thesisId: insertedTheses[2].id,
      lecturerId: byEmail["smensah@ug.edu.gh"],
      role: "PRIMARY",
      paid: 1,
      paidAt: new Date().toISOString(),
    },
    { thesisId: insertedTheses[2].id, lecturerId: byEmail["yasante@ug.edu.gh"], role: "CO_SUPERVISOR" },
  ]);

  await db
    .insert(settings)
    .values({ key: "payment_rate_per_thesis", value: "1500" })
    .onConflictDoUpdate({ target: settings.key, set: { value: "1500" } });

  console.log("Seed complete:", inserted.length, "users,", insertedTheses.length, "theses.");
}

main().then(() => process.exit(0));
