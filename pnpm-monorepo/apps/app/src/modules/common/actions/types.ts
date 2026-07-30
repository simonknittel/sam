export type ServerActionResponse = Readonly<{
  status: number;
  error?: unknown;
  errorMessage?: string;
}>;

export type ServerAction = (
  formData: FormData,
) => Promise<ServerActionResponse>;
