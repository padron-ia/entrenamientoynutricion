
with open(r'c:\Users\jmart\Downloads\academia-diabetes-online-crm (1)\components\CloserDashboard.tsx', 'rb') as f:
    content = f.read()
    # Find "{/* Acciones */}"
    pos = content.find(b'{/* Acciones */}')
    if pos != -1:
        start = max(0, pos - 50)
        end = min(len(content), pos + 100)
        print(f"Content around 'Acciones': {content[start:end]}")
    else:
        print("Not found")
