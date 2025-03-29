import { supabase } from "../../supabase";
import { z, ZodSchema, ZodObject, type ZodRawShape } from "zod";

export async function invoke<ResSchema extends ZodSchema>(
  functionName: string,
  req: any,
  requestSchema: ZodObject<ZodRawShape>, // ここを限定
  responseSchema: ResSchema,
): Promise<z.infer<ResSchema>> {
  const parsedReq = requestSchema.strip().parse(req);
  console.log("invoke", req, parsedReq);

  const startTime = performance.now();
  
  const data = await supabase.functions.invoke(`aigateway/${functionName}`, {
    body: JSON.stringify(parsedReq),
  });
  
  const endTime = performance.now();
  console.log(`Function ${functionName} executed in ${(endTime - startTime).toFixed(2)}ms`);

  return responseSchema.parse(data.data);
}
