export interface IOrg {
  id: number;
  title: string;
  chatId?: number;
  messageThreadId?: number;
  displayTitle?: string;
}

export interface IChat {
  id: number;
  title: string;
}
