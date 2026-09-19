import type { Business, Transaction, ScannedRecord } from "./constants";
import { uid } from "./utils";

const now = new Date();
const iso = (daysAgo: number) => {
  const d = new Date(now);
  d.setDate(now.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export function sampleBusiness(userId = "demo-user"): Business {
  return {
    id: "biz_demo",
    owner_id: userId,
    name: "Ada's Fashion Hub",
    category: "Fashion",
    phone: "0803 123 4567",
    location: "Lekki, Lagos",
    description: "Ankara and ready-to-wear fashion business",
    created_at: new Date().toISOString(),
  };
}

export function sampleTransactions(businessId = "biz_demo"): Transaction[] {
  const raw: Omit<Transaction, "id" | "created_at" | "business_id">[] = [
    { type: "income", description: "Ankara sales", amount: 45000, category: "Sales", transaction_date: iso(0), payment_status: "paid", payment_method: "Bank Transfer", customer_or_vendor: "Mrs. Okafor", notes: "", source: "manual" },
    { type: "income", description: "Catering order - wedding", amount: 120000, category: "Services", transaction_date: iso(1), payment_status: "paid", payment_method: "Bank Transfer", customer_or_vendor: "Mr. Adeyemi", notes: "50 guests", source: "manual" },
    { type: "income", description: "Gown alteration", amount: 8000, category: "Services", transaction_date: iso(4), payment_status: "pending", payment_method: "Cash", customer_or_vendor: "Mrs. Okafor", customer_phone: "0811 700 8822", notes: "", source: "manual" },
    { type: "income", description: "Shoe sales", amount: 25000, category: "Sales", transaction_date: iso(2), payment_status: "pending", payment_method: "Cash", customer_or_vendor: "Chidi", customer_phone: "0803 555 1234", notes: "Pay Friday", source: "manual" },
    { type: "expense", description: "Transportation to market", amount: 15000, category: "Transportation", transaction_date: iso(0), payment_status: "paid", payment_method: "Cash", notes: "", source: "manual" },
    { type: "expense", description: "20 bags of rice stock", amount: 80000, category: "Inventory / Stock", transaction_date: iso(3), payment_status: "paid", payment_method: "Bank Transfer", notes: "", source: "manual" },
    { type: "expense", description: "Staff salary - Ngozi", amount: 50000, category: "Salaries", transaction_date: iso(5), payment_status: "paid", payment_method: "Bank Transfer", notes: "", source: "manual" },
    { type: "expense", description: "Internet / Data - MTN", amount: 20000, category: "Internet / Data", transaction_date: iso(6), payment_status: "paid", payment_method: "POS", notes: "", source: "manual" },
    { type: "income", description: "Aso-ebi order", amount: 75000, category: "Sales", transaction_date: iso(8), payment_status: "credit", payment_method: "Other", customer_or_vendor: "Funmi", customer_phone: "0810 200 3344", notes: "", source: "manual" },
    { type: "expense", description: "Packaging materials", amount: 12000, category: "Packaging", transaction_date: iso(9), payment_status: "paid", payment_method: "Cash", notes: "", source: "manual" },
  ];
  return raw.map((t, i) => ({
    ...t,
    id: uid("txn"),
    business_id: businessId,
    created_at: new Date(Date.now() - i * 3600_000).toISOString(),
  }));
}

export function sampleScans(businessId = "biz_demo"): ScannedRecord[] {
  return [
    {
      id: uid("scan"),
      business_id: businessId,
      status: "completed",
      extracted_data: { description: "20 bags of rice", amount: 850000, type: "expense" },
      created_at: new Date().toISOString(),
    },
  ];
}
