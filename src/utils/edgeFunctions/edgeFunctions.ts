import { supabase } from "../../supabase";
import { ZodSchema } from "zod";

export async function invoke<Req, Res>(functionName: string, req: Req, responseSchema: ZodSchema<Res>): Promise<Res> {
  const data = await supabase.functions.invoke(
    `aigateway/${functionName}`,
    {
      body: JSON.stringify(req)
    });

  return responseSchema.parse(data.data); // validate response
}
