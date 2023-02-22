export interface IEntity {
  id: number;
  title: string;
  chat?: IChat;
}

export interface IChat {
  id: number;
  title: string;
}
