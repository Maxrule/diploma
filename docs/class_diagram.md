# Class Diagram

Нижче наведена діаграма основних доменних класів Django-проєкту: користувачі, оголошення, замовлення, чат і пов'язані сутності.

## Programmatic Version

Якщо потрібна не Mermaid-діаграма, а програмно згенероване зображення, використовуйте:

- `docs/generate_class_diagram.py`: Python-генератор SVG-діаграми.
- `docs/class_diagram.svg`: готова векторна діаграма класів.

Щоб перегенерувати файл:

```bash
python docs/generate_class_diagram.py
```

```mermaid
classDiagram
    direction LR

    class AbstractUser {
        <<Django>>
    }

    class CustomUser {
        +CharField full_name
        +CharField phone
        +CharField role
        +BooleanField email_verified
        +CharField verification_code
        +DateTimeField verification_code_expires_at
        +effective_role
    }

    class Visit {
        +ForeignKey user
        +CharField path
        +CharField ip
        +TextField user_agent
        +DateTimeField created_at
        +__str__()
    }

    class Category {
        +CharField name
        +IntegerField delivery_price
        +__str__()
    }

    class Location {
        +CharField city
        +FloatField latitude
        +FloatField longitude
        +__str__()
    }

    class Listing {
        +CharField title
        +ImageField photo
        +TextField description
        +DecimalField price
        +DateTimeField created_at
        +ForeignKey user
        +ForeignKey category
        +ForeignKey location
        +CharField name
        +EmailField email
        +CharField phone
        +BooleanField is_active
        +BooleanField reported
        +TextField report_reason
        +TextField report_message
        +DateTimeField reported_at
        +DateTimeField promoted_until
        +is_promoted
        +__str__()
    }

    class Image {
        +TextField image_url
        +ForeignKey listing
    }

    class Review {
        +IntegerField rating
        +TextField comment
        +ForeignKey user
        +ForeignKey listing
        +DateTimeField created_at
        +__str__()
    }

    class Favorite {
        +ForeignKey user
        +ForeignKey listing
    }

    class Order {
        +ForeignKey user
        +ForeignKey listing
        +CharField city
        +PositiveIntegerField delivery_price
        +PositiveIntegerField final_price
        +CharField payment_provider
        +CharField payment_reference
        +DateTimeField created_at
        +BooleanField paid
        +__str__()
    }

    class CanceledOrderLog {
        +PositiveIntegerField original_order_id
        +ForeignKey user
        +ForeignKey listing
        +CharField city
        +PositiveIntegerField delivery_price
        +PositiveIntegerField final_price
        +BooleanField paid
        +DateTimeField order_created_at
        +DateTimeField canceled_at
        +__str__()
    }

    class Message {
        +ForeignKey listing
        +ForeignKey sender
        +ForeignKey receiver
        +TextField content
        +DateTimeField timestamp
    }

    AbstractUser <|-- CustomUser

    CustomUser "1" --> "0..*" Visit : visits
    CustomUser "1" --> "0..*" Listing : listings
    CustomUser "1" --> "0..*" Review : reviews
    CustomUser "1" --> "0..*" Favorite : favorites
    CustomUser "1" --> "0..*" Order : orders
    CustomUser "0..1" --> "0..*" CanceledOrderLog : canceled_orders
    CustomUser "1" --> "0..*" Message : sent_messages
    CustomUser "1" --> "0..*" Message : received_messages

    Category "0..1" --> "0..*" Listing : category
    Location "0..1" --> "0..*" Listing : location

    Listing "1" --> "0..*" Image : images
    Listing "1" --> "0..*" Review : reviews
    Listing "1" --> "0..*" Favorite : favorited_by
    Listing "1" --> "0..*" Order : orders
    Listing "0..1" --> "0..*" CanceledOrderLog : canceled_orders
    Listing "0..1" --> "0..*" Message : messages
```

## Source Files

- `users/models.py`: `CustomUser`, `Visit`
- `listings/models.py`: `Category`, `Location`, `Listing`, `Image`, `Review`, `Favorite`
- `orders/models.py`: `Order`, `CanceledOrderLog`
- `chat/models.py`: `Message`
