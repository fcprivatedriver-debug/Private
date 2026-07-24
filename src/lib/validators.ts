import { z } from "zod";

export const incomeSchema = z.object({
  amount: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1).max(200),
  categoryId: z.string().min(1),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  memberId: z.string().optional().nullable(),
});

export const expenseSchema = z.object({
  amount: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional().nullable(),
  description: z.string().min(1).max(200),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional().nullable(),
  storeName: z.string().max(200).optional().nullable(),
  paymentMethod: z.enum([
    "CASH",
    "DEBIT_CARD",
    "CREDIT_CARD",
    "MB_WAY",
    "TRANSFER",
    "DIRECT_DEBIT",
    "REVOLUT",
    "OTHER",
  ]),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  memberId: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  receiptImageUrl: z.string().optional().nullable(),
  receiptPdfUrl: z.string().optional().nullable(),
  vatCents: z.number().int().optional().nullable(),
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  limit: z.string().min(1),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

export const goalSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum([
    "CAR",
    "HOUSE",
    "VACATION",
    "EMERGENCY",
    "INVESTMENT",
    "RETIREMENT",
    "EDUCATION",
    "OTHER",
    "CUSTOM",
  ]),
  target: z.string().min(1),
  current: z.string().optional(),
  deadline: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  accountKind: z.enum(["PERSONAL", "FAMILY", "BUSINESS"]).optional(),
});

export const savingPotSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum([
    "CAR",
    "HOUSE",
    "VACATION",
    "EMERGENCY",
    "INVESTMENT",
    "RETIREMENT",
    "EDUCATION",
    "OTHER",
    "CUSTOM",
  ]),
  target: z.string().min(1),
  current: z.string().optional(),
  deadline: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  accountKind: z.enum(["PERSONAL", "FAMILY", "BUSINESS"]).optional(),
});

export const investmentSchema = z.object({
  potId: z.string().min(1),
  investmentVehicle: z.enum([
    "TERM_DEPOSIT",
    "SAVINGS_CERTIFICATES",
    "ETF",
    "INVESTMENT_FUND",
    "INTEREST_ACCOUNT",
    "OTHER",
  ]),
  investedCapital: z.string().min(1),
  annualRatePercent: z.coerce.number().min(0).max(100),
  capitalization: z.enum(["SIMPLE", "COMPOUND"]),
  interestPeriod: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "YEARLY", "AT_MATURITY"]),
  investmentStartDate: z.string().min(1),
});

export const goalItemSchema = z.object({
  goalId: z.string().min(1),
  name: z.string().min(1).max(120),
  amount: z.string().min(1),
});

export const recurringSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().min(1),
  categoryId: z.string().min(1),
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional().nullable(),
  nextDueDate: z.string().min(1),
  paymentMethod: z.enum([
    "CASH",
    "DEBIT_CARD",
    "CREDIT_CARD",
    "MB_WAY",
    "TRANSFER",
    "DIRECT_DEBIT",
    "REVOLUT",
    "OTHER",
  ]),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().optional(),
  parentId: z.string().optional().nullable(),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6),
  familyName: z.string().min(2).max(80).optional(),
});
