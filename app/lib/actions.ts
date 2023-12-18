'use server';

import { revalidatePath } from "next/cache";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { redirect } from "next/navigation";

const formSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = formSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const rawFormData = {
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  };

  const { customerId, amount, status } = CreateInvoice.parse(rawFormData);
  const amountInCents = amount * 100; // To avoid JS floating-point errors
  const date = new Date().toISOString().split('T')[0]; // '2023-12-18T04:37:34.867Z' -> '2023-12-18'

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  revalidatePath('/dashboard/invoices'); // revalidate cache and fetch latest data
  redirect('/dashboard/invoices')
};

const UpdateInvoice = formSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
};

export async function deleteInvoice(id: string) {
  await sql`
    DELETE FROM invoices WHERE id = ${id}
  `;
  revalidatePath('/dashboard/invoices');
};
