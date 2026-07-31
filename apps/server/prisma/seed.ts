import bcrypt from "bcrypt";
import { PrismaClient, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

const userIds = {
  admin: "00000000-0000-4000-8000-000000000001",
  atharv: "00000000-0000-4000-8000-000000000002",
  maya: "00000000-0000-4000-8000-000000000003",
};

const companyIds = {
  acme: "10000000-0000-4000-8000-000000000001",
  globex: "10000000-0000-4000-8000-000000000002",
  northstar: "10000000-0000-4000-8000-000000000003",
};

async function seed() {
  const [adminPassword, userPassword] = await Promise.all([
    bcrypt.hash("Admin123!", 12),
    bcrypt.hash("User123!", 12),
  ]);

  const users = [
    {
      id: userIds.admin,
      name: "Admin",
      email: "admin@crm.local",
      passwordHash: adminPassword,
      systemRole: SystemRole.ADMIN,
    },
    {
      id: userIds.atharv,
      name: "Atharv",
      email: "atharv@crm.local",
      passwordHash: userPassword,
      systemRole: SystemRole.USER,
    },
    {
      id: userIds.maya,
      name: "Maya",
      email: "maya@crm.local",
      passwordHash: userPassword,
      systemRole: SystemRole.USER,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        systemRole: user.systemRole,
      },
      create: user,
    });
  }

  const companies = [
    {
      id: companyIds.acme,
      name: "Acme Corp",
      website: "https://acme.example",
      industry: "Software",
      description: "Enterprise account",
      createdById: userIds.admin,
    },
    {
      id: companyIds.globex,
      name: "Globex Technologies",
      website: "https://globex.example",
      industry: "Technology",
      description: "Growing technology company",
      createdById: userIds.admin,
    },
    {
      id: companyIds.northstar,
      name: "Northstar Labs",
      website: "https://northstar.example",
      industry: "Research",
      description: "Applied research organization",
      createdById: userIds.admin,
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: company,
      create: company,
    });
  }

  const contacts = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@acme.example",
      jobTitle: "CTO",
      companyId: companyIds.acme,
      createdById: userIds.admin,
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@globex.example",
      jobTitle: "VP of Sales",
      companyId: companyIds.globex,
      createdById: userIds.admin,
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      firstName: "Meera",
      lastName: "Patel",
      email: "meera@northstar.example",
      jobTitle: "Research Director",
      companyId: companyIds.northstar,
      createdById: userIds.admin,
    },
  ];

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: contact,
      create: contact,
    });
  }

  console.log("Seed completed.");
  console.log("Admin: admin@crm.local / Admin123!");
  console.log("Atharv: atharv@crm.local / User123!");
  console.log("Maya: maya@crm.local / User123!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
