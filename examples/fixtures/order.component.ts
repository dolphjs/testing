import { Component } from '@dolphjs/dolph/decorators';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Component({ controllers: [OrderController], services: [OrderService] })
export class OrderComponent {}
