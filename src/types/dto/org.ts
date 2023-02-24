import { ApiProperty } from '@nestjs/swagger';
import { IChat, IOrg } from '../interfaces';

export class ChatDto implements IChat {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;
}

export class OrgDto implements IOrg {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: ChatDto })
  chat: ChatDto;
}

export class CreateOrgDto {
  @ApiProperty()
  title: string;
}
