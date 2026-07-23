import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Introduza um email válido");

export const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
  .max(128, "A palavra-passe é demasiado longa");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduza a palavra-passe"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Nome demasiado curto"),
    lastName: z.string().trim().min(2, "Apelido demasiado curto"),
    email: emailSchema,
    phone: z.string().trim().min(9, "Telefone inválido").optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["client", "driver"]),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: "Deve aceitar os termos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As palavras-passe não coincidem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
