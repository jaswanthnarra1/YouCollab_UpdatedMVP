import { apiClient, unwrap } from "@/lib/api";

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  captchaToken: string;
}

export const contactService = {
  async submit(payload: ContactPayload) {
    const { data } = await apiClient.post("/api/contact", payload);
    return unwrap<{ message: string }>(data);
  },
};
