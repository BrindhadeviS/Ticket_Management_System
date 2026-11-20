import * as employeeService from './employee.service.js';

//! create employee
export const createEmployee = async (req, res, next) => {
    try {
        const employeeData = req.body;

        const employee = await employeeService.createEmployee(employeeData);

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee
        });
    } catch (error) {
        next(error);
    }
};

//! get all employees with optional pagination
export const getAllEmployees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const employees = await employeeService.getAllEmployees(page, limit);
    res.status(200).json({
      success: true,
      page,
      limit,
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

//! activate or deactivate employee
export const setActiveEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { active } = req.body; // expect boolean
    if (typeof active === 'string') {
      active = active.toLowerCase() === 'true';
    }
    const currentUserId = req.user?.id || req.user?.employeeId;
    const employee = await employeeService.setActive(id, active, currentUserId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }
    res.status(200).json({
      success: true,
      message: `Employee ${active ? 'activated' : 'deactivated'} successfully`,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};


//! get employee by id
export const getEmployeeById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const employee = await employeeService.getEmployeeById(id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: employee
        });

    } catch (error) {
        next(error);
    }
};

//! update employee
export const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const employeeData = req.body;

        const employee = await employeeService.updateEmployee(
            id,
            employeeData,
            req.user?.id || req.user?.employeeId
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });

    } catch (error) {
        next(error);
    }
};
