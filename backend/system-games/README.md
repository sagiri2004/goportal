# System Games

Built-in web games live here and are served by the backend at `/system-games`.

To add another simple system web game:

1. Create a new folder, for example `backend/system-games/my-game`.
2. Put a self-contained `index.html` inside it. Extra local assets can sit beside it.
3. Add a migration row in `user_games` and `user_game_builds`.
4. Use `play_base_path = /system-games/my-game` and `entry_file = index.html`.

System games should be small, static browser games that do not need a build step.
