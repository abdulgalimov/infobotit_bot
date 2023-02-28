import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private customerRepository: Repository<CustomerEntity>,
  ) {}

  async create(orgId: number, phone: string) {
    let customer = await this.customerRepository.findOne({
      where: {
        orgId,
        phone,
      },
    });

    if (!customer) {
      customer = this.customerRepository.create();
      customer.orgId = orgId;
      customer.phone = phone;

      await this.customerRepository.insert(customer);
    }

    return customer;
  }

  async findById(id) {
    return this.customerRepository.findOne({
      where: {
        id,
      },
    });
  }
}
