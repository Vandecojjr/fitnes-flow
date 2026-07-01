using System;
using System.Collections.Generic;
using System.Linq;
using FitnessFlow.Api.Models;

namespace FitnessFlow.Api.Data
{
    public static class DbSeeder
    {
        public static void Seed(FitnessFlowDbContext db)
        {
            db.Database.EnsureCreated();

            // Seed Exercises if empty
            if (!db.Exercises.Any())
            {
                var exercises = new List<Exercise>
                {
                    new() { Name = "Supino Reto", Description = "Exercício com barra para peitoral.", DefaultDurationSeconds = 60, Category = "Força" },
                    new() { Name = "Agachamento Livre", Description = "Agachamento clássico com barra para pernas.", DefaultDurationSeconds = 90, Category = "Força" },
                    new() { Name = "Levantamento Terra", Description = "Exercício multiarticular para cadeia posterior.", DefaultDurationSeconds = 120, Category = "Força" },
                    new() { Name = "Barra Fixa", Description = "Exercício de puxada na barra.", DefaultDurationSeconds = 60, Category = "Força" },
                    new() { Name = "Desenvolvimento Halteres", Description = "Exercício para ombros com halteres.", DefaultDurationSeconds = 60, Category = "Força" },
                    new() { Name = "Rosca Direta", Description = "Exercício isolado para bíceps.", DefaultDurationSeconds = 45, Category = "Força" },
                    new() { Name = "Tríceps Pulley", Description = "Exercício na polia para tríceps.", DefaultDurationSeconds = 45, Category = "Força" },
                    new() { Name = "Prancha Abdominal", Description = "Exercício estático para core.", DefaultDurationSeconds = 60, Category = "Core" },
                    new() { Name = "Corrida na Esteira", Description = "Corrida contínua.", DefaultDurationSeconds = 600, Category = "Cardio" },
                    new() { Name = "Descanso ativo", Description = "Tempo de pausa entre séries.", DefaultDurationSeconds = 60, Category = "Mobilidade" }
                };

                db.Exercises.AddRange(exercises);
                db.SaveChanges();
            }

            // Seed default Admin User if empty
            if (!db.Users.Any())
            {
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "admin",
                    Email = "admin@fitnessflow.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = Roles.Admin,
                    CreatedAt = DateTime.UtcNow
                };

                db.Users.Add(adminUser);
                db.SaveChanges();

                // Add a default user too
                var normalUser = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "user",
                    Email = "user@fitnessflow.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
                    Role = Roles.User,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(normalUser);
                db.SaveChanges();

                // Seed some workouts for the seeded user
                var supino = db.Exercises.FirstOrDefault(e => e.Name == "Supino Reto");
                var agachamento = db.Exercises.FirstOrDefault(e => e.Name == "Agachamento Livre");
                var rosca = db.Exercises.FirstOrDefault(e => e.Name == "Rosca Direta");
                
                if (supino != null && agachamento != null && rosca != null)
                {
                    var workout = new Workout
                    {
                        Id = Guid.NewGuid(),
                        Name = "Treino A - Peito e Braço",
                        Description = "Treino básico para iniciantes com foco em peito e bíceps.",
                        UserId = normalUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow
                    };

                    workout.Exercises.Add(new WorkoutExercise { WorkoutId = workout.Id, ExerciseId = supino.Id, Order = 1, Sets = 4, Reps = 10, Weight = 20, RestBetweenSetsSeconds = 60, RestAfterExerciseSeconds = 90 });
                    workout.Exercises.Add(new WorkoutExercise { WorkoutId = workout.Id, ExerciseId = rosca.Id, Order = 2, Sets = 3, Reps = 12, Weight = 10, RestBetweenSetsSeconds = 45, RestAfterExerciseSeconds = 120 });
                    
                    db.Workouts.Add(workout);

                    var workoutB = new Workout
                    {
                        Id = Guid.NewGuid(),
                        Name = "Treino B - Pernas",
                        Description = "Foco em membros inferiores.",
                        UserId = normalUser.Id,
                        CreatedById = adminUser.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    workoutB.Exercises.Add(new WorkoutExercise { WorkoutId = workoutB.Id, ExerciseId = agachamento.Id, Order = 1, Sets = 4, Reps = 8, Weight = 40, RestBetweenSetsSeconds = 90, RestAfterExerciseSeconds = 180 });

                    db.Workouts.Add(workoutB);

                    // Add a default Goal for this user
                    var goal = new Goal
                    {
                        Id = Guid.NewGuid(),
                        UserId = normalUser.Id,
                        Title = "Completar 10 Treinos",
                        Description = "Meta de consistência mensal",
                        TargetValue = 10,
                        CurrentValue = 2,
                        Unit = "sessions",
                        TargetDate = DateTime.UtcNow.AddDays(30),
                        IsCompleted = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    db.Goals.Add(goal);

                    db.SaveChanges();
                }
            }
        }
    }
}
