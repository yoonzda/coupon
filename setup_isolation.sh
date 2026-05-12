#!/bin/bash

# Configuration of folders and their corresponding users
declare -A SERVICES=(
    ["dccoop.kr"]="dccoop"
    ["bizflow.kr"]="bizflow"
    ["foodtech2026"]="foodtech"
    ["gonggam-travel"]="gonggam"
    ["mnagate"]="mnagate"
    ["civil_new"]="civil_new"
    ["jawolspace.kr"]="jawolspace"
    ["ganghwa_shrimp"]="ganghwa_user"
    ["artpani"]="artpani"
    ["Ongjin_coupon"]="ongjin"
)

echo "Service | Username | Password"
echo "-----------------------------------"

for folder in "${!SERVICES[@]}"; do
    user="${SERVICES[$folder]}"
    
    # Generate password: Capitalize first letter + !2026_x
    first_char=$(echo "${user:0:1}" | tr 'a-z' 'A-Z')
    rest="${user:1}"
    password="${first_char}${rest}!2026_x"

    # Create user if not exists
    if ! id "$user" &>/dev/null; then
        useradd -d "/home/www/$folder" -s /bin/bash "$user"
    fi

    # Update home directory just in case
    usermod -d "/home/www/$folder" "$user"

    # Change password
    echo "$user:$password" | chpasswd

    # Set ownership and permissions safely
    if [ -d "/home/www/$folder" ]; then
        chown -R "$user":"$user" "/home/www/$folder"
        
        # We don't do mass chmod 755/644 just in case they have specific exec permissions, 
        # but we fix 777 permissions to 755
        find "/home/www/$folder" -type d -perm 777 -exec chmod 755 {} \;
        find "/home/www/$folder" -type f -perm 777 -exec chmod 644 {} \;
    fi

    # Output to table
    printf "%-15s | %-12s | %s\n" "$folder" "$user" "$password"
done
