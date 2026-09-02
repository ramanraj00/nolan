import express, { Request, Response } from 'express';
import { customerSchema } from '../validators/customerValidator';
import { CustomerService } from '../services/customer.service';

const router = express.Router();

// ==========================================
// CREATE A NEW CUSTOMER (POST Request)
// ==========================================
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = customerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const customerData = validationResult.data;

    const customer = await CustomerService.createCustomer(customerData);

    res.status(201).json({
      message: 'Customer successfully registered under merchant',
      data: customer,
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);

    if (error.message === 'MERCHANT_NOT_FOUND') {
      res.status(404).json({ 
        error: 'Merchant not found or is deactivated. A customer must be created under a valid merchant.' 
      });
      return;
    }

    if (error.code === '23505') {
       res.status(409).json({ error: 'Customer already exists for this merchant' });
       return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while creating the customer' });
  }
});

// ==========================================
// VIEW CUSTOMERS FOR A SPECIFIC MERCHANT (GET Request)
// ==========================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;

    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /customers?merchant_id=uuid)' 
      });
      return;
    }

    const customers = await CustomerService.getCustomersByMerchant(merchant_id);

    res.status(200).json(customers);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching customers' });
  }
});

// ==========================================
// VIEW A SPECIFIC CUSTOMER (GET Request)
// ==========================================
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);

    const customer = await CustomerService.getCustomerById(customerId);

    if (!customer) {
       res.status(404).json({ error: 'Customer not found' });
       return;
    }

    res.status(200).json(customer);
  } catch (error: any) {
    console.error('Error fetching specific customer:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the customer' });
  }
});

// ==========================================
// UPDATE SPECIFIC CUSTOMER (PATCH Request)
// ==========================================
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);

    const validationResult = customerSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const updates = validationResult.data;

    const columnMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      externalCustomerId: 'external_customer_id',
    };

    const updateKeys = Object.keys(updates).filter((key) => columnMap[key]);

    if (updateKeys.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }

    const updatedCustomer = await CustomerService.updateCustomer(customerId, updates, updateKeys, columnMap);

    if (!updatedCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.status(200).json({
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error: any) {
    console.error('Error updating specific customer:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while updating the customer' });
  }
});

// ==========================================
// SOFT DELETE CUSTOMER (DELETE Request)
// ==========================================
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);

    const deletedCustomer = await CustomerService.softDeleteCustomer(customerId);

    if (!deletedCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.status(200).json({
      message: 'Customer deactivated safely',
      data: deletedCustomer,
    });
  } catch (error: any) {
    console.error('Error deactivating customer:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while deactivating the customer' });
  }
});

export default router;
