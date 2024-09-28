import { Notebook } from './notebook';
import { advise } from '../firebase';
import { onlineAccount } from '../utils/accountStore';

export async function callAdvise(action: string, notebook: Notebook, instruction?: string): Promise<any> {
  const result = await advise({action, notebook, instruction});
  console.log(result);
  onlineAccount.update(x => {x.feathral = result.feathral; return x;});
  return result.result;
}
