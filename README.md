# PCE-ERP

Project Back-end Code and System Documentation.

## Project Structure


This is a project folder architecture, each will explained briefly. 

    .
    ├── assets                   # Contains all assets
        ├── json                 # contains all json files
        ├── reports              # generated reports saved in assets
        ├── users                # user images, docs and other files
        ├── log                  # contains all api route logs.
    ├── email-formats            # Email Formats (Currently system is not generating any emails)
    ├── src                      # All Source files
        ├── api                  # All API End Points and their initaite point index.js
        ├── conf                 # Project Configuration file .conf and its index.js
        ├── controllers          # Business Logic for Every Model Interlinked api and models
        ├── crons                # crons for different process.
        ├── generators           # Fake data generators                 
        ├── middlewares          # Middlewares for logging, logged In and RBAC used by apis.
        ├── models               # Models for different entities (e.g unit, employee).            
        ├── utilites             # helpers functions, constants, different generic modules   
        ├── index.js             # Start Point of an application.
    ├── package.json             # Package Dependencies and npm commands
    └── README.md
