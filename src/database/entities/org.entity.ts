import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'orgs' })
export class OrgEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({
    type: 'bigint',
    default: '0',
  })
  @Index()
  chatId: number;

  @Column({
    type: 'integer',
    nullable: true,
    default: null,
  })
  messageThreadId: number;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  displayTitle: string;
}
