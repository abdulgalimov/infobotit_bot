import { ApiProperty } from '@nestjs/swagger';
import { IChat, IEntity } from '../interfaces';

export class ChatDto implements IChat {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;
}

export class EntityDto implements IEntity {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: ChatDto })
  chat: ChatDto;
}

export class CreateEntityDto {
  @ApiProperty()
  title: string;
}
