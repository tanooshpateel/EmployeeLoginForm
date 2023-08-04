const express = require('express');
const app = express();
const { Pool } = require('pg');

// PostgreSQL configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'formsample',
    password: 'root',
    port: 5432, // Default PostgreSQL port is 5432
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function to get all employees from the database
async function getAllEmployees() {
    const query = 'SELECT * FROM employees';
    const { rows } = await pool.query(query);
    return rows;
}

app.get('/signup', async (req, res) => {
    try {
        const { email } = req.query;

        if (email) {
            // Check if the user already exists in the database based on email
            const userQuery = 'SELECT * FROM users WHERE email = $1';
            const { rows } = await pool.query(userQuery, [email]);

            if (rows.length > 0) {
                return res.send('User with this email already exists. Please login instead.');
            }
        }

        res.render('signup1', { email }); // Render the signup form
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.status(500).send('An error occurred while processing the form.');
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user already exists in the database based on email
        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await pool.query(userQuery, [email]);

        if (rows.length > 0) {
            return res.send('User with this email already exists. Please login instead.');
        }

        // Insert form data into the PostgreSQL database
        const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)';
        await pool.query(query, [name, email, password]);

        res.redirect('/login'); // Redirect to the login form after successful signup
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('An error occurred while processing the form.');
    }
});

app.get('/login', async (req, res) => {
    try {
        const { email } = req.query;

        if (email) {
            // Check if the user already exists in the database based on email
            const userQuery = 'SELECT * FROM users WHERE email = $1';
            const { rows } = await pool.query(userQuery, [email]);

            if (rows.length === 0) {
                return res.send('User with this email does not exist. Please signup instead.');
            }
        }

        res.render('login1', { email }); // Render the login form
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.status(500).send('An error occurred while processing the form.');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Fetch user from the database based on the provided email
        const query = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await pool.query(query, [email]);

        // Check if a user with the provided email exists
        if (rows.length === 0) {
            return res.send('User not found. Please check your email and password.');
        }

        // Check if the provided password matches the stored password
        const user = rows[0];
        if (user.password !== password) {
            return res.send('Invalid password. Please check your email and password.');
        }

        // Authentication successful, redirect to the employee details page
        res.redirect('/employee-details');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('An error occurred during login.');
    }
});

// Route to handle displaying the employee details page
// Route to handle displaying the employee details page
app.get('/employee-details', async (req, res) => {
    try {
        const employees = await getAllEmployees();
        const { search } = req.query;

        // Implement the search functionality to find the employee by name or ID
        let searchedEmployeeId = null;
        if (search) {
            const foundEmployee = employees.find(employee => employee.name.toLowerCase().includes(search.toLowerCase()) || employee.id.toString() === search);
            if (foundEmployee) {
                searchedEmployeeId = foundEmployee.id;
            }
        }

        res.render('employee-details', { employees, searchedEmployeeId });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        res.status(500).send('An error occurred while fetching employee details.');
    }
});


// Route to handle displaying the add employee page
app.get('/employee/add', (req, res) => {
    const updatedEmployee = false; // Set the value of updatedEmployee here based on your logic
    res.render('add-employee', { updatedEmployee });
});

// Route to handle adding a new employee
app.post('/employee/add', async (req, res) => {
    try {
        // Extract form data from the request body
        const { name, email, department, contact_number } = req.body;

        // Insert form data into the PostgreSQL database
        const query = 'INSERT INTO employees (name, email, department, contact_number) VALUES ($1, $2, $3, $4) RETURNING *';
        const { rows } = await pool.query(query, [name, email, department, contact_number]);

        res.redirect('/employee-details');
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).send('An error occurred while adding an employee.');
    }
});

// Route to handle displaying the update employee page
app.get('/employee/update/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Fetch employee from the database based on the provided ID
        const query = 'SELECT * FROM employees WHERE id = $1';
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.send('Employee not found.');
        }

        const employee = rows[0];
        res.render('update-employee', { employee });
    } catch (error) {
        console.error('Error fetching employee for update:', error);
        res.status(500).send('An error occurred while fetching employee for update.');
    }
});

// Route to handle updating an employee
app.post('/employee/update/:id', async (req, res) => {
    const id = req.params.id;
    const { name, email, department, contact_number } = req.body;
    try {
        // Update the employee in the PostgreSQL database based on the provided ID
        const query = 'UPDATE employees SET name = $1, email = $2, department = $3, contact_number = $4 WHERE id = $5 RETURNING *';
        const { rows } = await pool.query(query, [name, email, department, contact_number, id]);

        if (rows.length === 0) {
            return res.send('Employee not found.');
        }

        res.redirect('/employee-details');
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).send('An error occurred while updating an employee.');
    }
});
// Route to handle deleting an employee
app.post('/employee/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        // Delete the employee from the PostgreSQL database based on the provided ID
        const query = 'DELETE FROM employees WHERE id = $1';
        await pool.query(query, [id]);

        res.redirect('/employee-details');
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).send('An error occurred while deleting an employee.');
    }
});


// ... (remaining code)

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

app.get('/', (req, res) => {
    res.redirect('/signup'); // Redirect to the login page
});
