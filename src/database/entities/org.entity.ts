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
}
