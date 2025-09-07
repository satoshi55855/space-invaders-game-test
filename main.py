
import pygame
import sys
import random
import math

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# --- Colors ---
BLACK = (0, 0, 0)
NEON_GREEN = (57, 255, 20)
NEON_PINK = (255, 20, 147)
NEON_BLUE = (0, 255, 255)
WHITE = (255, 255, 255)
GREY = (40, 40, 40)

# --- Game Settings ---
PLAYER_SPEED = 5
PLAYER_BULLET_SPEED = 15
INVADER_BULLET_SPEED = 7
INVADER_SPEED = 1
BULLET_COOLDOWN = 100  # milliseconds
AUTO_FIRE_ENABLED = True # Trueで自動連射、Falseで単発

# --- Player ---
class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((50, 30), pygame.SRCALPHA)
        self.draw_ship()
        self.rect = self.image.get_rect(midbottom=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 10))
        self.speed = PLAYER_SPEED
        self.last_shot = pygame.time.get_ticks()

    def draw_ship(self):
        # Main body
        pygame.draw.polygon(self.image, NEON_BLUE, [(25, 0), (0, 25), (50, 25)])
        # Cockpit
        pygame.draw.rect(self.image, NEON_PINK, (20, 10, 10, 10))

    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT] and self.rect.right < SCREEN_WIDTH:
            self.rect.x += self.speed

    def shoot(self, all_sprites, bullets):
        now = pygame.time.get_ticks()
        if now - self.last_shot > BULLET_COOLDOWN:
            self.last_shot = now
            bullet = Bullet(self.rect.centerx, self.rect.top, NEON_BLUE, -PLAYER_BULLET_SPEED)
            all_sprites.add(bullet)
            bullets.add(bullet)

# --- Bullet ---
class Bullet(pygame.sprite.Sprite):
    def __init__(self, x, y, color, speed):
        super().__init__()
        self.image = pygame.Surface((4, 20))
        self.image.fill(color)
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = speed
        self.color = color

    def update(self):
        self.rect.y += self.speed
        if self.rect.bottom < 0 or self.rect.top > SCREEN_HEIGHT:
            self.kill()

# --- Invader ---
class Invader(pygame.sprite.Sprite):
    def __init__(self, x, y, invader_type):
        super().__init__()
        self.invader_type = invader_type
        self.image = pygame.Surface((30, 30), pygame.SRCALPHA)
        self.draw_invader(0)
        self.rect = self.image.get_rect(center=(x, y))
        self.animation_frame = 0
        self.last_animation = pygame.time.get_ticks()

    def draw_invader(self, frame):
        self.image.fill((0,0,0,0)) # Clear image
        if self.invader_type == 1:
            color = NEON_GREEN
            if frame == 0:
                pygame.draw.rect(self.image, color, (5, 5, 20, 20))
                pygame.draw.rect(self.image, BLACK, (10, 10, 10, 10))
            else:
                pygame.draw.rect(self.image, color, (0, 0, 30, 30))
                pygame.draw.rect(self.image, BLACK, (5, 5, 20, 20))
        elif self.invader_type == 2:
            color = NEON_PINK
            if frame == 0:
                pygame.draw.polygon(self.image, color, [(15,0), (0,15), (30,15)])
            else:
                pygame.draw.polygon(self.image, color, [(15,5), (0,20), (30,20)])


    def update(self):
        now = pygame.time.get_ticks()
        if now - self.last_animation > 500:
            self.last_animation = now
            self.animation_frame = 1 - self.animation_frame
            self.draw_invader(self.animation_frame)

# --- Barrier ---
class Barrier(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((10, 10))
        self.image.fill(NEON_GREEN)
        self.rect = self.image.get_rect(center=(x,y))
        self.health = 5

    def hit(self):
        self.health -= 1
        if self.health <= 0:
            self.kill()
        else:
            # Fade color on hit
            alpha = int(255 * (self.health / 5))
            self.image.set_alpha(alpha)


# --- Game ---
class Game:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Neon Invaders")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.running = True
        self.state = "playing"
        self.score = 0
        self.lives = 3

    def new_game(self):
        self.all_sprites = pygame.sprite.Group()
        self.invaders = pygame.sprite.Group()
        self.bullets = pygame.sprite.Group()
        self.player_bullets = pygame.sprite.Group()
        self.barriers = pygame.sprite.Group()

        self.player = Player()
        self.all_sprites.add(self.player)

        self.create_invaders()
        self.create_barriers()
        
        self.invader_direction = 1
        self.invader_move_down = 0
        self.invader_shoot_timer = pygame.time.get_ticks()


    def create_invaders(self):
        for row in range(5):
            for col in range(10):
                invader_type = 1 if row < 2 else 2
                x = 100 + col * 50
                y = 50 + row * 50
                invader = Invader(x, y, invader_type)
                self.all_sprites.add(invader)
                self.invaders.add(invader)

    def create_barriers(self):
        for i in range(4):
            barrier_x = (SCREEN_WIDTH / 4) * i + (SCREEN_WIDTH / 8)
            for row in range(3):
                for col in range(5):
                    x = barrier_x + col * 10
                    y = SCREEN_HEIGHT - 150 + row * 10
                    b = Barrier(x,y)
                    self.all_sprites.add(b)
                    self.barriers.add(b)

    def run(self):
        self.new_game()
        while self.running:
            self.clock.tick(FPS)
            self.events()
            if self.state == "playing":
                self.update()
            self.draw()

    def events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            if event.type == pygame.KEYDOWN:
                if not AUTO_FIRE_ENABLED and self.state == "playing" and event.key == pygame.K_SPACE:
                    self.player.shoot(self.all_sprites, self.player_bullets)
                if self.state != "playing" and event.key == pygame.K_r:
                    self.state = "playing"
                    self.lives = 3
                    self.score = 0
                    self.new_game()


    def update(self):
        self.all_sprites.update()

        # Auto-fire logic
        if AUTO_FIRE_ENABLED and self.state == "playing":
            keys = pygame.key.get_pressed()
            if keys[pygame.K_SPACE]:
                self.player.shoot(self.all_sprites, self.player_bullets)

        # Move invaders
        move_sideways = False
        for invader in self.invaders:
            if invader.rect.right >= SCREEN_WIDTH or invader.rect.left <= 0:
                self.invader_direction *= -1
                self.invader_move_down = 10
                move_sideways = True
                break
        
        if move_sideways:
            for invader in self.invaders:
                invader.rect.y += self.invader_move_down
        
        for invader in self.invaders:
            invader.rect.x += self.invader_direction * INVADER_SPEED


        # Invader shoot
        now = pygame.time.get_ticks()
        if now - self.invader_shoot_timer > 1000 and self.invaders:
            self.invader_shoot_timer = now
            random_invader = random.choice(self.invaders.sprites())
            bullet = Bullet(random_invader.rect.centerx, random_invader.rect.bottom, NEON_PINK, INVADER_BULLET_SPEED)
            self.all_sprites.add(bullet)
            self.bullets.add(bullet)

        # Collisions
        # Player bullets with invaders
        hits = pygame.sprite.groupcollide(self.invaders, self.player_bullets, True, True)
        for hit in hits:
            self.score += 100

        # Invader bullets with player
        hits = pygame.sprite.spritecollide(self.player, self.bullets, True)
        if hits:
            self.lives -= 1
            if self.lives <= 0:
                self.state = "game_over"

        # Bullets with barriers
        pygame.sprite.groupcollide(self.barriers, self.player_bullets, False, True)
        pygame.sprite.groupcollide(self.barriers, self.bullets, False, True)
        
        # Invaders with barriers
        pygame.sprite.groupcollide(self.invaders, self.barriers, False, True)

        # Check for win/loss
        if not self.invaders:
            self.state = "win"
        
        for invader in self.invaders:
            if invader.rect.bottom >= SCREEN_HEIGHT - 50:
                self.state = "game_over"
                break


    def draw(self):
        self.screen.fill(BLACK)
        self.all_sprites.draw(self.screen)
        
        # Draw score and lives
        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        lives_text = self.font.render(f"Lives: {self.lives}", True, WHITE)
        self.screen.blit(lives_text, (SCREEN_WIDTH - 120, 10))

        if self.state == "game_over":
            self.show_message("GAME OVER", "Press R to Restart")
        elif self.state == "win":
            self.show_message("YOU WIN!", "Press R to Restart")

        pygame.display.flip()

    def show_message(self, large_text, small_text):
        large_font = pygame.font.Font(None, 72)
        small_font = pygame.font.Font(None, 36)

        large_surf = large_font.render(large_text, True, NEON_PINK)
        large_rect = large_surf.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 40))
        
        small_surf = small_font.render(small_text, True, WHITE)
        small_rect = small_surf.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 20))

        self.screen.blit(large_surf, large_rect)
        self.screen.blit(small_surf, small_rect)


if __name__ == "__main__":
    game = Game()
    game.run()
    pygame.quit()
    sys.exit()
