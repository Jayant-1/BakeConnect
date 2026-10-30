package com.bakeconnect.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI bakeConnectOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("BakeConnect REST API")
                        .version("1.0.0")
                        .description("BakeConnect — Smart Bakery Distribution & Direct Ordering Management System. Authoritative backend for B2C retail and B2B wholesale operations.")
                        .contact(new Contact().name("BakeConnect Engineering Team").email("engineering@bakeconnect.local"))
                        .license(new License().name("Proprietary Capstone License")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
