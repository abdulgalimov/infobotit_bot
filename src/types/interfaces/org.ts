export interface IOrg {
  id: number;
  title: string;
  chatId?: number;
  messageThreadId?: number;
}

export interface IChat {
  id: number;
  title: string;
}
