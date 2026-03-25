export interface ArgDef {
  name: string;
  type: string;
}

export interface FuncEntry {
  name: string;
  args: ArgDef[];
  returnType: string;
  lang: string;
  handleName: string;
  isAsync: boolean;
}
